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

var possibleEnvPaths = new[]
{
    Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "secret", ".env"),
    Path.Combine(Directory.GetCurrentDirectory(), "..", "secret", ".env"),
    Path.Combine(Directory.GetCurrentDirectory(), "secret", ".env"),
    Path.Combine(Directory.GetCurrentDirectory(), ".env")
};
foreach (var p in possibleEnvPaths)
{
    if (File.Exists(p))
    {
        Env.Load(p);
        break;
    }
}

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddHttpClient();
builder.Services.AddHttpClient("supabase");

var connectionString = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING");
var dataSource = new NpgsqlDataSourceBuilder(connectionString)
    .EnableDynamicJson()
    .Build();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(dataSource));
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddSingleton<IGeoLocationService, GeoLocationService>();
builder.Services.AddScoped<IAuthService, AuthService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});


builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor | Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
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
        {
            if (context.Request.Path.StartsWithSegments("/hubs"))
                return RateLimitPartition.GetNoLimiter("hubs");

            return RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: GetPartitionKey(context),
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 30,
                    Window = TimeSpan.FromSeconds(1),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 0
                });
        }),
        PartitionedRateLimiter.Create<HttpContext, string>(context =>
        {
            if (context.Request.Path.StartsWithSegments("/hubs"))
                return RateLimitPartition.GetNoLimiter("hubs");

            return RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: GetPartitionKey(context),
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 300,
                    Window = TimeSpan.FromMinutes(1),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 0
                });
        })
    );

    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        context.HttpContext.Response.ContentType = "application/json";

        var retryAfter = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfterValue)
            ? retryAfterValue.TotalSeconds
            : 30;

        if (retryAfter <= 0) retryAfter = 30;

        context.HttpContext.Response.Headers.RetryAfter = ((int)retryAfter).ToString();

        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            statusCode = 429,
            title = "Too Many Requests",
            error = "Too Many Requests",
            message = "You have made too many requests in a short period. Please wait a moment before trying again.",
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

app.UseForwardedHeaders();

app.UseExceptionHandler(exceptionHandlerApp =>
{
    exceptionHandlerApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";

        await context.Response.WriteAsJsonAsync(new
        {
            statusCode = 500,
            title = "Internal Server Error",
            error = "Internal Server Error",
            message = "An unexpected error occurred on our server. Our team is already looking into it."
        });
    });
});

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
            var isExplicitRefreshEndpoint = context.Request.Path.Equals("/api/auth/refresh", StringComparison.OrdinalIgnoreCase);
            
            if (!isExplicitRefreshEndpoint)
            {
                var authService = context.RequestServices.GetRequiredService<IAuthService>();
                var logger = context.RequestServices.GetService<ILogger<Program>>();

                const int maxRetries = 2;
                for (int attempt = 0; attempt <= maxRetries; attempt++)
                {
                    try
                    {
                        var ipAddress = context.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim()
                                        ?? context.Connection.RemoteIpAddress?.ToString();
                        var userAgent = context.Request.Headers["User-Agent"].ToString();
                        var platformVersion = context.Request.Headers["Sec-CH-UA-Platform-Version"].FirstOrDefault()
                                              ?? context.Request.Headers["X-Platform-Version"].FirstOrDefault();
                        var deviceModel = context.Request.Headers["Sec-CH-UA-Model"].FirstOrDefault()
                                          ?? context.Request.Headers["X-Device-Model"].FirstOrDefault();

                        var result = await authService.RefreshTokenAsync(refreshToken, ipAddress, userAgent, platformVersion, deviceModel);
                        
                        var accessCookieOptions = new CookieOptions
                        {
                            HttpOnly = true,
                            Secure = true,
                            SameSite = SameSiteMode.None,
                            Path = "/",
                            Expires = DateTime.UtcNow.AddMinutes(15)
                        };

                        var refreshCookieOptions = new CookieOptions
                        {
                            HttpOnly = true,
                            Secure = true,
                            SameSite = SameSiteMode.None,
                            Path = "/",
                            Expires = DateTime.UtcNow.AddDays(15)
                        };

                        context.Response.Cookies.Append("accessToken", result.AccessToken, accessCookieOptions);
                        context.Response.Cookies.Append("refreshToken", result.RefreshToken, refreshCookieOptions);

                        context.Items["newAccessToken"] = result.AccessToken;
                        break;
                    }
                    catch (UnauthorizedAccessException)
                    {
                        var deleteCookieOptions = new CookieOptions
                        {
                            HttpOnly = true,
                            Secure = true,
                            SameSite = SameSiteMode.None,
                            Path = "/"
                        };
                        context.Response.Cookies.Delete("accessToken", deleteCookieOptions);
                        context.Response.Cookies.Delete("refreshToken", deleteCookieOptions);
                        break;
                    }
                    catch (Exception ex)
                    {
                        logger?.LogWarning(ex, "Transient error refreshing token (attempt {Attempt}/{MaxRetries})", attempt + 1, maxRetries + 1);
                        if (attempt < maxRetries)
                        {
                            await Task.Delay(500 * (attempt + 1));
                        }
                    }
                }
            }
        }
    }

    context.Response.Headers["Accept-CH"] = "Sec-CH-UA-Platform-Version, Sec-CH-UA-Platform, Sec-CH-UA-Model";

    await next(context);
});

app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();

app.UseStaticFiles();
app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();