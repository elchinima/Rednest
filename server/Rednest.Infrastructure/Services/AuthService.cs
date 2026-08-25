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
    private readonly IGeoLocationService _geoLocationService;

    public AuthService(
        IUserRepository userRepository, 
        IConfiguration configuration,
        IGeoLocationService geoLocationService)
    {
        _userRepository = userRepository;
        _configuration = configuration;
        _geoLocationService = geoLocationService;
    }

    public async Task<(string AccessToken, string RefreshToken, bool HasName)> AuthenticateOrRegisterAsync(
        LoginRequest request, 
        string? ipAddress, 
        string? userAgent = null,
        string? platformVersion = null,
        string? deviceModel = null)
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

        var now = DateTime.UtcNow;

        userSession.Sessions.RemoveAll(s => IsSessionExpired(s, now));

        var refreshToken = GenerateRefreshToken();
        var uaInfo = UserAgentParser.Parse(userAgent, platformVersion, deviceModel);

        var sessionEntry = new SessionEntry
        {
            RefreshToken = refreshToken,
            RefreshTokenExpiryTime = now.AddDays(15),
            LastLoginIp = ipAddress,
            OperatingSystem = uaInfo.OperatingSystem,
            DeviceName = uaInfo.DeviceName,
            DeviceType = uaInfo.DeviceType,
            UserAgent = userAgent,
            CreatedAt = now,
            LastActiveAt = now,
            IsActive = true
        };

        userSession.Sessions.Add(sessionEntry);

        await _userRepository.UpdateSessionAsync(userSession);

        bool hasName = !string.IsNullOrEmpty(user.Name);
        return (GenerateJwtToken(user), refreshToken, hasName);
    }

    public async Task<(string AccessToken, string RefreshToken)> RefreshTokenAsync(
        string refreshToken, 
        string? ipAddress = null, 
        string? userAgent = null,
        string? platformVersion = null,
        string? deviceModel = null)
    {
        var now = DateTime.UtcNow;
        var result = await _userRepository.GetByRefreshTokenAsync(refreshToken);

        // Grace period: if the token was recently rotated (within 30s), accept the previous token
        // This handles concurrent requests that all arrive with the same old refresh token
        if (result == null)
        {
            result = await _userRepository.GetByPreviousRefreshTokenAsync(refreshToken);
            if (result != null)
            {
                var rotatedAt = result.Value.Entry.PreviousTokenRotatedAt;
                // If the previous token was rotated more than 30 seconds ago — real invalid token
                if (!rotatedAt.HasValue || (now - rotatedAt.Value).TotalSeconds > 30)
                {
                    throw new UnauthorizedAccessException("Invalid, terminated or expired refresh token");
                }
                // Within grace period — return the already-rotated new token
                return (GenerateJwtToken(result.Value.User), result.Value.Entry.RefreshToken);
            }
        }

        if (result == null || result.Value.Entry.IsActive == false || IsSessionExpired(result.Value.Entry, now))
        {
            throw new UnauthorizedAccessException("Invalid, terminated or expired refresh token");
        }

        var (user, session, oldEntry) = result.Value;

        var newAccessToken = GenerateJwtToken(user);
        var newRefreshToken = GenerateRefreshToken();

        var uaInfo = UserAgentParser.Parse(userAgent, platformVersion, deviceModel);

        // Store the previous token for grace period handling of concurrent requests
        oldEntry.PreviousRefreshToken = oldEntry.RefreshToken;
        oldEntry.PreviousTokenRotatedAt = now;

        oldEntry.RefreshToken = newRefreshToken;
        oldEntry.RefreshTokenExpiryTime = now.AddDays(15);
        oldEntry.LastActiveAt = now;
        oldEntry.IsActive = true;
        if (!string.IsNullOrEmpty(ipAddress)) oldEntry.LastLoginIp = ipAddress;
        if (!string.IsNullOrEmpty(userAgent))
        {
            oldEntry.OperatingSystem = uaInfo.OperatingSystem;
            oldEntry.DeviceName = uaInfo.DeviceName;
            oldEntry.DeviceType = uaInfo.DeviceType;
            oldEntry.UserAgent = userAgent;
        }

        session.Sessions.RemoveAll(s => s != oldEntry && IsSessionExpired(s, now));

        await _userRepository.UpdateSessionAsync(session);

        return (newAccessToken, newRefreshToken);
    }

    public async Task<List<UserSessionDto>> GetUserSessionsAsync(Guid userId, string? currentRefreshToken)
    {
        var now = DateTime.UtcNow;
        var userSession = await _userRepository.GetSessionByUserIdAsync(userId);
        if (userSession == null || userSession.Sessions == null || userSession.Sessions.Count == 0)
        {
            return new List<UserSessionDto>();
        }

        var countBefore = userSession.Sessions.Count;
        userSession.Sessions.RemoveAll(s => IsSessionExpired(s, now));
        if (userSession.Sessions.Count != countBefore)
        {
            await _userRepository.UpdateSessionAsync(userSession);
        }

        var result = new List<UserSessionDto>();

        foreach (var s in userSession.Sessions)
        {
            var country = await _geoLocationService.GetCountryAsync(s.LastLoginIp);
            var isCurrent = !string.IsNullOrEmpty(currentRefreshToken) && s.RefreshToken == currentRefreshToken;

            using var sha256 = SHA256.Create();
            var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(s.RefreshToken));
            var sessionId = Convert.ToHexString(hashBytes)[..16].ToLowerInvariant();

            result.Add(new UserSessionDto
            {
                Id = sessionId,
                DeviceName = s.DeviceName ?? "Unknown Device",
                DeviceType = s.DeviceType ?? "Desktop",
                OperatingSystem = s.OperatingSystem ?? "Unknown OS",
                Country = country,
                LastLoginIp = s.LastLoginIp,
                CreatedAt = s.CreatedAt,
                LastActiveAt = s.LastActiveAt ?? s.CreatedAt,
                IsActive = s.IsActive == true,
                IsCurrent = isCurrent
            });
        }

        return result
            .OrderByDescending(s => s.IsCurrent)
            .ThenByDescending(s => s.LastActiveAt ?? s.CreatedAt)
            .ToList();
    }

    public async Task<bool> RevokeSessionAsync(Guid userId, string sessionId, string? currentRefreshToken)
    {
        var userSession = await _userRepository.GetSessionByUserIdAsync(userId);
        if (userSession == null || userSession.Sessions == null)
        {
            return false;
        }

        using var sha256 = SHA256.Create();

        SessionEntry? targetSession = null;
        foreach (var s in userSession.Sessions)
        {
            var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(s.RefreshToken));
            var id = Convert.ToHexString(hashBytes)[..16].ToLowerInvariant();
            if (id == sessionId)
            {
                targetSession = s;
                break;
            }
        }

        if (targetSession == null)
        {
            return false;
        }

        if (!string.IsNullOrEmpty(currentRefreshToken) && targetSession.RefreshToken == currentRefreshToken)
        {
            throw new InvalidOperationException("Cannot revoke the current active session.");
        }

        targetSession.IsActive = false;
        await _userRepository.UpdateSessionAsync(userSession);
        return true;
    }

    private static bool IsSessionExpired(SessionEntry? s, DateTime now)
    {
        if (s == null) return true;
        if (string.IsNullOrWhiteSpace(s.RefreshToken)) return true;


        if (s.RefreshTokenExpiryTime != default && s.RefreshTokenExpiryTime <= now)
        {
            return true;
        }

        var referenceTime = s.LastActiveAt ?? (s.CreatedAt != default ? s.CreatedAt : (DateTime?)null);
        if (referenceTime.HasValue && referenceTime.Value != default && referenceTime.Value.AddDays(15) <= now)
        {
            return true;
        }

        if (s.RefreshTokenExpiryTime == default && !referenceTime.HasValue)
        {
            return true;
        }

        return false;
    }

    private string GenerateJwtToken(User user)
    {
        var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")
                        ?? _configuration["JWT_SECRET"]
                        ?? "super_secret_key_that_is_at_least_32_chars_long";

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
