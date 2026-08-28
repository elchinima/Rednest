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
    private readonly IEmailService _emailService;

    public AuthService(
        IUserRepository userRepository, 
        IConfiguration configuration,
        IGeoLocationService geoLocationService,
        IEmailService emailService)
    {
        _userRepository = userRepository;
        _configuration = configuration;
        _geoLocationService = geoLocationService;
        _emailService = emailService;
    }

    public async Task<(bool Requires2FA, string? AccessToken, string? RefreshToken, bool HasName, User? User)> AuthenticateOrRegisterAsync(
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
                TwoFactorEnabled = false,
                Subscribe = false,
                AccountVerify = new List<AccountVerifyEntry>(),
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
        if (userSession != null && !userSession.IsActive)
        {
            throw new UnauthorizedAccessException("Your account has been suspended or blocked.");
        }

        if (userSession == null)
        {
            userSession = new UserSession
            {
                UserId = user.Id,
                RegistrationIp = ipAddress,
                TwoFactorEnabled = false,
                Subscribe = false,
                AccountVerify = new List<AccountVerifyEntry>(),
                Sessions = new List<SessionEntry>()
            };
            await _userRepository.AddSessionAsync(userSession);
        }

        if (userSession.AccountVerify == null)
        {
            userSession.AccountVerify = new List<AccountVerifyEntry>();
        }
        if (userSession.Sessions == null)
        {
            userSession.Sessions = new List<SessionEntry>();
        }

        var now = DateTime.UtcNow;
        CleanExpiredData(userSession, now);

        if (userSession.TwoFactorEnabled)
        {
            var code = RandomNumberGenerator.GetInt32(1000, 10000).ToString("D4");
            userSession.AccountVerify.Add(new AccountVerifyEntry
            {
                Type = "2FA",
                Code = code,
                Expire = 15,
                CreateData = now
            });

            await _userRepository.UpdateSessionAsync(userSession);
            await _emailService.SendTwoFactorCodeAsync(user.Email, code);

            bool hasName = !string.IsNullOrEmpty(user.Name);
            return (true, null, null, hasName, user);
        }

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

        bool userHasName = !string.IsNullOrEmpty(user.Name);
        return (false, GenerateJwtToken(user), refreshToken, userHasName, user);
    }

    public async Task<(string AccessToken, string RefreshToken, bool HasName, User User)> VerifyTwoFactorAsync(
        VerifyTwoFactorRequest request,
        string? ipAddress,
        string? userAgent = null,
        string? platformVersion = null,
        string? deviceModel = null)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Code))
        {
            throw new UnauthorizedAccessException("Email and verification code are required");
        }

        var user = await _userRepository.GetByEmailAsync(request.Email);
        if (user == null)
        {
            throw new UnauthorizedAccessException("Invalid credentials");
        }

        var userSession = user.Session ?? await _userRepository.GetSessionByUserIdAsync(user.Id);
        if (userSession == null || userSession.AccountVerify == null || userSession.AccountVerify.Count == 0)
        {
            throw new UnauthorizedAccessException("Invalid or expired verification code");
        }

        var now = DateTime.UtcNow;
        CleanExpiredData(userSession, now);

        var trimmedCode = request.Code.Trim();
        var entry = userSession.AccountVerify
            .Where(v => v.Type == "2FA" && v.Code == trimmedCode)
            .OrderByDescending(v => v.CreateData)
            .FirstOrDefault();

        if (entry == null)
        {
            throw new UnauthorizedAccessException("Invalid verification code");
        }

        if (entry.CreateData.AddMinutes(entry.Expire) <= now)
        {
            throw new UnauthorizedAccessException("Verification code has expired. Please request a new code.");
        }

        if (userSession.Sessions == null)
        {
            userSession.Sessions = new List<SessionEntry>();
        }

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
        return (GenerateJwtToken(user), refreshToken, hasName, user);
    }

    public async Task ResendTwoFactorCodeAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new UnauthorizedAccessException("Email is required");
        }

        var user = await _userRepository.GetByEmailAsync(email);
        if (user == null)
        {
            throw new UnauthorizedAccessException("User not found");
        }

        var userSession = user.Session ?? await _userRepository.GetSessionByUserIdAsync(user.Id);
        if (userSession == null || !userSession.TwoFactorEnabled)
        {
            throw new InvalidOperationException("Two-Factor Authentication is not enabled for this account");
        }

        if (userSession.AccountVerify == null)
        {
            userSession.AccountVerify = new List<AccountVerifyEntry>();
        }

        var now = DateTime.UtcNow;
        CleanExpiredData(userSession, now);

        var code = RandomNumberGenerator.GetInt32(1000, 10000).ToString("D4");
        userSession.AccountVerify.Add(new AccountVerifyEntry
        {
            Type = "2FA",
            Code = code,
            Expire = 15,
            CreateData = now
        });

        await _userRepository.UpdateSessionAsync(userSession);
        await _emailService.SendTwoFactorCodeAsync(user.Email, code);
    }

    public async Task<bool> ToggleTwoFactorAsync(Guid userId, bool? enabled = null)
    {
        var userSession = await _userRepository.GetSessionByUserIdAsync(userId);
        if (userSession == null)
        {
            userSession = new UserSession
            {
                UserId = userId,
                TwoFactorEnabled = enabled ?? true,
                Subscribe = false,
                AccountVerify = new List<AccountVerifyEntry>(),
                Sessions = new List<SessionEntry>()
            };
            await _userRepository.AddSessionAsync(userSession);
            return userSession.TwoFactorEnabled;
        }

        if (enabled.HasValue)
        {
            userSession.TwoFactorEnabled = enabled.Value;
        }
        else
        {
            userSession.TwoFactorEnabled = !userSession.TwoFactorEnabled;
        }

        await _userRepository.UpdateSessionAsync(userSession);
        return userSession.TwoFactorEnabled;
    }

    public async Task RequestSubscriptionCodeAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new ArgumentException("Email is required");
        }

        var user = await _userRepository.GetByEmailAsync(email.Trim());
        if (user == null)
        {
            throw new KeyNotFoundException("This email is not registered. Please create an account first.");
        }

        var userSession = user.Session ?? await _userRepository.GetSessionByUserIdAsync(user.Id);
        if (userSession == null)
        {
            userSession = new UserSession
            {
                UserId = user.Id,
                TwoFactorEnabled = false,
                Subscribe = false,
                AccountVerify = new List<AccountVerifyEntry>(),
                Sessions = new List<SessionEntry>()
            };
            await _userRepository.AddSessionAsync(userSession);
        }

        if (userSession.AccountVerify == null)
        {
            userSession.AccountVerify = new List<AccountVerifyEntry>();
        }

        var now = DateTime.UtcNow;
        CleanExpiredData(userSession, now);

        var code = RandomNumberGenerator.GetInt32(1000, 10000).ToString("D4");
        userSession.AccountVerify.Add(new AccountVerifyEntry
        {
            Type = "Subscribe",
            Code = code,
            Expire = 15,
            CreateData = now
        });

        await _userRepository.UpdateSessionAsync(userSession);
        await _emailService.SendSubscriptionCodeAsync(user.Email, code);
    }

    public async Task VerifySubscriptionCodeAsync(string email, string code)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(code))
        {
            throw new ArgumentException("Email and confirmation code are required");
        }

        var user = await _userRepository.GetByEmailAsync(email.Trim());
        if (user == null)
        {
            throw new KeyNotFoundException("This email is not registered.");
        }

        var userSession = user.Session ?? await _userRepository.GetSessionByUserIdAsync(user.Id);
        if (userSession == null || userSession.AccountVerify == null || userSession.AccountVerify.Count == 0)
        {
            throw new UnauthorizedAccessException("Invalid or expired confirmation code");
        }

        var now = DateTime.UtcNow;
        CleanExpiredData(userSession, now);

        var trimmedCode = code.Trim();
        var entry = userSession.AccountVerify
            .Where(v => v.Type == "Subscribe" && v.Code == trimmedCode)
            .OrderByDescending(v => v.CreateData)
            .FirstOrDefault();

        if (entry == null)
        {
            throw new UnauthorizedAccessException("Invalid confirmation code");
        }

        if (entry.CreateData.AddMinutes(entry.Expire) <= now)
        {
            throw new UnauthorizedAccessException("Confirmation code has expired. Please request a new code.");
        }

        userSession.Subscribe = true;
        await _userRepository.UpdateSessionAsync(userSession);
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

        if (result == null)
        {
            result = await _userRepository.GetByPreviousRefreshTokenAsync(refreshToken);
            if (result != null)
            {
                var rotatedAt = result.Value.Entry.PreviousTokenRotatedAt;
                if (!rotatedAt.HasValue || (now - rotatedAt.Value).TotalSeconds > 30)
                {
                    throw new UnauthorizedAccessException("Invalid, terminated or expired refresh token");
                }
                return (GenerateJwtToken(result.Value.User), result.Value.Entry.RefreshToken);
            }
        }

        if (result == null || result.Value.Session.IsActive == false || result.Value.Entry.IsActive == false || IsSessionExpired(result.Value.Entry, now))
        {
            throw new UnauthorizedAccessException("Invalid, terminated or expired refresh token");
        }

        var (user, session, oldEntry) = result.Value;

        var newAccessToken = GenerateJwtToken(user);
        var newRefreshToken = GenerateRefreshToken();

        var uaInfo = UserAgentParser.Parse(userAgent, platformVersion, deviceModel);

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

        var changed = CleanExpiredData(userSession, now);
        if (changed)
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

    private static bool CleanExpiredData(UserSession userSession, DateTime now)
    {
        var changed = false;
        if (userSession.Sessions != null)
        {
            var countBefore = userSession.Sessions.Count;
            userSession.Sessions.RemoveAll(s => IsSessionExpired(s, now));
            if (userSession.Sessions.Count != countBefore) changed = true;
        }

        if (userSession.AccountVerify != null)
        {
            var countBefore = userSession.AccountVerify.Count;
            userSession.AccountVerify.RemoveAll(v => v.CreateData.AddHours(24) <= now);
            if (userSession.AccountVerify.Count != countBefore) changed = true;
        }

        return changed;
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
