using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Rednest.Application.DTOs;
using Rednest.Application.Interfaces;
using Rednest.Core.Entities;

namespace Rednest.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IConfiguration _configuration;

    public AuthService(IUserRepository userRepository, IConfiguration configuration)
    {
        _userRepository = userRepository;
        _configuration = configuration;
    }

    public async Task<(string AccessToken, string RefreshToken, bool HasName)> AuthenticateOrRegisterAsync(
        LoginRequest request, 
        string? ipAddress, 
        string? userAgent = null,
        string? platformVersion = null)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email);

        if (user == null)
        {
            user = new User
            {
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            };
            await _userRepository.AddAsync(user);

            var newSession = new UserSession
            {
                UserId = user.Id,
                RegistrationIp = ipAddress,
                Sessions = new List<SessionEntry>()
            };
            await _userRepository.AddSessionAsync(newSession);
            user = await _userRepository.GetByEmailAsync(request.Email);
        }
        else
        {
            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                throw new UnauthorizedAccessException("Invalid credentials");
            }
        }

        var userSession = user!.Session ?? await _userRepository.GetSessionByUserIdAsync(user.Id);
        if (userSession == null)
        {
            userSession = new UserSession
            {
                UserId = user.Id,
                RegistrationIp = ipAddress,
                Sessions = new List<SessionEntry>()
            };
            await _userRepository.AddSessionAsync(userSession);
        }

        var refreshToken = GenerateRefreshToken();
        var uaInfo = UserAgentParser.Parse(userAgent, platformVersion);

        var sessionEntry = new SessionEntry
        {
            RefreshToken = refreshToken,
            RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(15),
            LastLoginIp = ipAddress,
            OperatingSystem = uaInfo.OperatingSystem,
            DeviceName = uaInfo.DeviceName,
            DeviceType = uaInfo.DeviceType,
            UserAgent = userAgent,
            CreatedAt = DateTime.UtcNow,
            LastActiveAt = DateTime.UtcNow
        };

        userSession.Sessions.Add(sessionEntry);
        userSession.Sessions.RemoveAll(s => s.RefreshTokenExpiryTime <= DateTime.UtcNow && s.RefreshToken != refreshToken);

        await _userRepository.UpdateSessionAsync(userSession);

        bool hasName = !string.IsNullOrEmpty(user.Name);
        return (GenerateJwtToken(user), refreshToken, hasName);
    }

    public async Task<(string AccessToken, string RefreshToken)> RefreshTokenAsync(
        string refreshToken, 
        string? ipAddress = null, 
        string? userAgent = null,
        string? platformVersion = null)
    {
        var result = await _userRepository.GetByRefreshTokenAsync(refreshToken);
        if (result == null || result.Value.Entry.RefreshTokenExpiryTime <= DateTime.UtcNow)
        {
            throw new UnauthorizedAccessException("Invalid or expired refresh token");
        }

        var (user, session, oldEntry) = result.Value;

        var newAccessToken = GenerateJwtToken(user);
        var newRefreshToken = GenerateRefreshToken();

        var uaInfo = UserAgentParser.Parse(userAgent, platformVersion);

        oldEntry.RefreshToken = newRefreshToken;
        oldEntry.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(15);
        oldEntry.LastActiveAt = DateTime.UtcNow;
        if (!string.IsNullOrEmpty(ipAddress)) oldEntry.LastLoginIp = ipAddress;
        if (!string.IsNullOrEmpty(userAgent))
        {
            oldEntry.OperatingSystem = uaInfo.OperatingSystem;
            oldEntry.DeviceName = uaInfo.DeviceName;
            oldEntry.DeviceType = uaInfo.DeviceType;
            oldEntry.UserAgent = userAgent;
        }

        session.Sessions.RemoveAll(s => s.RefreshTokenExpiryTime <= DateTime.UtcNow && s.RefreshToken != newRefreshToken);

        await _userRepository.UpdateSessionAsync(session);

        return (newAccessToken, newRefreshToken);
    }

    private string GenerateJwtToken(User user)
    {
        var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")
                        ?? _configuration["JWT_SECRET"]
                        ?? throw new InvalidOperationException("JWT_SECRET is missing");

        var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER")
                        ?? _configuration["JWT_ISSUER"]
                        ?? "RednestApp";

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtIssuer,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string GenerateRefreshToken()
    {
        var randomNumber = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }
}
