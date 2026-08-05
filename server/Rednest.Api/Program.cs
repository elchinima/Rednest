using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Rednest.Application.Interfaces;
using Rednest.Infrastructure.Data;
using Rednest.Infrastructure.Repositories;
using Rednest.Infrastructure.Services;
using DotNetEnv;

var builder = WebApplication.CreateBuilder(args);

var envPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "secret", ".env");
if (File.Exists(envPath))
{
    Env.Load(envPath);
}

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));
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
app.UseAuthorization();

app.UseStaticFiles();
app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();