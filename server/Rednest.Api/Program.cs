using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Npgsql;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Rednest.Api.Middleware;
using Rednest.Application.Interfaces;
using Rednest.Infrastructure.Data;
using Rednest.Infrastructure.Repositories;
using Rednest.Infrastructure.Services;
using DotNetEnv;

Environment.SetEnvironmentVariable("DOTNET_USE_POLLING_FILE_WATCHER", "true");
Environment.SetEnvironmentVariable("DOTNET_hostBuilder:reloadConfigOnChange", "false");

var builder = WebApplication.CreateBuilder(args);

var envPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "secret", ".env");
if (File.Exists(envPath))
{
    Env.Load(envPath);
}

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddHttpClient("supabase");

var connectionString = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING");
var dataSource = new NpgsqlDataSourceBuilder(connectionString)
    .EnableDynamicJson()
    .Build();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(dataSource));
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IAuthService, AuthService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    static string GetPartitionKey(HttpContext context)
    {
        var userId = context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!string.IsNullOrEmpty(userId))
            return $"user:{userId}";

        return $"ip:{context.Connection.RemoteIpAddress?.ToString() ?? "unknown"}";
    }

    options.GlobalLimiter = PartitionedRateLimiter.CreateChained(
        PartitionedRateLimiter.Create<HttpContext, string>(context =>
            RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: GetPartitionKey(context),
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 10,
                    Window = TimeSpan.FromSeconds(1),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 0
                })),
        PartitionedRateLimiter.Create<HttpContext, string>(context =>
            RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: GetPartitionKey(context),
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 100,
                    Window = TimeSpan.FromMinutes(1),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 0
                }))
    );

    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        context.HttpContext.Response.ContentType = "application/json";

        var retryAfter = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfterValue)
            ? retryAfterValue.TotalSeconds
            : 1;

        context.HttpContext.Response.Headers.RetryAfter = ((int)retryAfter).ToString();

        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            error = "Too many requests. Please try again later.",
            retryAfterSeconds = (int)retryAfter
        }, cancellationToken);
    };
});

var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? "super_secret_key_that_is_at_least_32_chars_long";
var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "RednestApp";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtIssuer,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                if (context.HttpContext.Items.TryGetValue("newAccessToken", out var newToken))
                {
                    context.Token = newToken as string;
                }
                else
                {
                    context.Token = context.Request.Cookies["accessToken"];
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");

app.UseMiddleware<BandwidthThrottlingMiddleware>(1_048_576L);

app.Use(async (context, next) =>
{
    var accessToken = context.Request.Cookies["accessToken"];
    var refreshToken = context.Request.Cookies["refreshToken"];

    if (!string.IsNullOrEmpty(refreshToken))
    {
        bool needsRefresh = false;

        if (string.IsNullOrEmpty(accessToken))
        {
            needsRefresh = true;
        }
        else
        {
            var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
            if (handler.CanReadToken(accessToken))
            {
                var jwt = handler.ReadJwtToken(accessToken);
                if (jwt.ValidTo < DateTime.UtcNow.AddMinutes(1))
                {
                    needsRefresh = true;
                }
            }
        }

        if (needsRefresh)
        {
            var authService = context.RequestServices.GetRequiredService<IAuthService>();
            try
            {
                var result = await authService.RefreshTokenAsync(refreshToken);
                
                var accessCookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = SameSiteMode.Strict,
                    Expires = DateTime.UtcNow.AddMinutes(30)
                };

                var refreshCookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = SameSiteMode.Strict,
                    Expires = DateTime.UtcNow.AddDays(30)
                };

                context.Response.Cookies.Append("accessToken", result.AccessToken, accessCookieOptions);
                context.Response.Cookies.Append("refreshToken", result.RefreshToken, refreshCookieOptions);

                context.Items["newAccessToken"] = result.AccessToken;
            }
            catch { }
        }
    }

    await next(context);
});

app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();

app.UseStaticFiles();
app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();