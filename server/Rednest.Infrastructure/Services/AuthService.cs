using System.Net.Http.Headers;
using System.Text.Json;

namespace Rednest.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IConfiguration _configuration;
    private readonly IGeoLocationService _geoLocationService;
    private readonly IEmailService _emailService;
    private readonly IHttpClientFactory _httpClientFactory;

    public AuthService(
        IUserRepository userRepository, 
        IConfiguration configuration,
        IGeoLocationService geoLocationService,
        IEmailService emailService,
        IHttpClientFactory httpClientFactory)
    {
        _userRepository = userRepository;
        _configuration = configuration;
        _geoLocationService = geoLocationService;
        _emailService = emailService;
        _httpClientFactory = httpClientFactory;
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
            IsActive = true,
            AuthType = "Password"
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
            IsActive = true,
            AuthType = "Password"
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

        if (userSession.Subscribe)
        {
            throw new InvalidOperationException("This email is already subscribed to the newsletter. If you need assistance or wish to change your subscription, please contact technical support at hello@rednestcoffee.com.");
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

        if (userSession.Subscribe)
        {
            throw new InvalidOperationException("This email is already subscribed to the newsletter. If you need assistance or wish to change your subscription, please contact technical support at hello@rednestcoffee.com.");
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

    public async Task RequestPasswordResetCodeAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new ArgumentException("Email is required.");
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _userRepository.GetByEmailAsync(normalizedEmail);
        if (user == null)
        {
            throw new KeyNotFoundException("No account found with this email address.");
        }

        var userSession = user.Session ?? await _userRepository.GetSessionByUserIdAsync(user.Id);
        if (userSession != null && !userSession.IsActive)
        {
            throw new UnauthorizedAccessException("Your account has been suspended or blocked.");
        }

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

        userSession.AccountVerify.RemoveAll(v => v.Type == "PasswordReset");

        var code = RandomNumberGenerator.GetInt32(1000000, 10000000).ToString("D7");
        userSession.AccountVerify.Add(new AccountVerifyEntry
        {
            Type = "PasswordReset",
            Code = code,
            Expire = 15,
            CreateData = now
        });

        await _userRepository.UpdateSessionAsync(userSession);
        await _emailService.SendPasswordResetCodeAsync(user.Email, code);
    }

    public async Task<(string AccessToken, string RefreshToken, bool HasName, User User)> ResetPasswordAsync(
        ResetPasswordRequest request,
        string? ipAddress,
        string? userAgent = null,
        string? platformVersion = null,
        string? deviceModel = null)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            throw new ArgumentException("Email is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Code))
        {
            throw new ArgumentException("Verification code is required.");
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword))
        {
            throw new ArgumentException("New password is required.");
        }

        if (request.NewPassword.Length < 6)
        {
            throw new ArgumentException("Password must be at least 6 characters long.");
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await _userRepository.GetByEmailAsync(normalizedEmail);
        if (user == null)
        {
            throw new KeyNotFoundException("No account found with this email address.");
        }

        var userSession = user.Session ?? await _userRepository.GetSessionByUserIdAsync(user.Id);
        if (userSession != null && !userSession.IsActive)
        {
            throw new UnauthorizedAccessException("Your account has been suspended or blocked.");
        }

        if (userSession == null || userSession.AccountVerify == null || userSession.AccountVerify.Count == 0)
        {
            throw new UnauthorizedAccessException("Invalid or expired verification code.");
        }

        var now = DateTime.UtcNow;
        CleanExpiredData(userSession, now);

        var trimmedCode = request.Code.Trim();
        var entry = userSession.AccountVerify
            .Where(v => v.Type == "PasswordReset" && v.Code == trimmedCode)
            .OrderByDescending(v => v.CreateData)
            .FirstOrDefault();

        if (entry == null)
        {
            throw new UnauthorizedAccessException("Invalid verification code. Please check the code and try again.");
        }

        if (entry.CreateData.AddMinutes(entry.Expire) <= now)
        {
            throw new UnauthorizedAccessException("Verification code has expired. Please request a new code.");
        }

        userSession.AccountVerify.Remove(entry);

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _userRepository.UpdateAsync(user);

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
            IsActive = true,
            AuthType = "PasswordReset"
        };

        userSession.Sessions.Add(sessionEntry);
        await _userRepository.UpdateSessionAsync(userSession);

        bool hasName = !string.IsNullOrEmpty(user.Name);
        return (GenerateJwtToken(user), refreshToken, hasName, user);
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
                IsCurrent = isCurrent,
                AuthType = string.IsNullOrEmpty(s.AuthType) ? "Password" : s.AuthType
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

    public string GetGoogleAuthUrl(string? redirectUri = null)
    {
        var clientId = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID")
                       ?? _configuration["GOOGLE_CLIENT_ID"];

        if (string.IsNullOrWhiteSpace(clientId))
        {
            throw new InvalidOperationException("Google Client ID is not configured.");
        }

        var effectiveRedirectUri = !string.IsNullOrWhiteSpace(redirectUri)
            ? redirectUri
            : Environment.GetEnvironmentVariable("GOOGLE_REDIRECT_URI")
              ?? $"{Environment.GetEnvironmentVariable("BASE_URL")}/google-auth";

        var encodedRedirect = Uri.EscapeDataString(effectiveRedirectUri);
        var scope = Uri.EscapeDataString("openid email profile");

        return $"https://accounts.google.com/o/oauth2/v2/auth?client_id={clientId}&redirect_uri={encodedRedirect}&response_type=code&scope={scope}&access_type=offline&prompt=select_account";
    }

    public async Task<(string AccessToken, string RefreshToken, bool HasName, User User)> AuthenticateWithGoogleAsync(
        string code,
        string? redirectUri = null,
        string? ipAddress = null,
        string? userAgent = null,
        string? platformVersion = null,
        string? deviceModel = null)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            throw new ArgumentException("Authorization code is required.", nameof(code));
        }

        var clientId = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID")
                       ?? _configuration["GOOGLE_CLIENT_ID"];
        var clientSecret = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_SECRET")
                           ?? _configuration["GOOGLE_CLIENT_SECRET"];

        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
        {
            throw new InvalidOperationException("Google OAuth credentials are not properly configured.");
        }

        var effectiveRedirectUri = !string.IsNullOrWhiteSpace(redirectUri)
            ? redirectUri
            : Environment.GetEnvironmentVariable("GOOGLE_REDIRECT_URI")
              ?? $"{Environment.GetEnvironmentVariable("BASE_URL")}/google-auth";

        var client = _httpClientFactory.CreateClient();

        var tokenRequestParams = new Dictionary<string, string>
        {
            { "code", code.Trim() },
            { "client_id", clientId },
            { "client_secret", clientSecret },
            { "redirect_uri", effectiveRedirectUri },
            { "grant_type", "authorization_code" }
        };

        var tokenResponse = await client.PostAsync("https://oauth2.googleapis.com/token", new FormUrlEncodedContent(tokenRequestParams));
        var tokenBody = await tokenResponse.Content.ReadAsStringAsync();

        if (!tokenResponse.IsSuccessStatusCode)
        {
            throw new UnauthorizedAccessException($"Google token exchange failed: {tokenBody}");
        }

        using var tokenJsonDoc = JsonDocument.Parse(tokenBody);
        var googleAccessToken = tokenJsonDoc.RootElement.TryGetProperty("access_token", out var accTokenProp)
            ? accTokenProp.GetString()
            : null;

        if (string.IsNullOrEmpty(googleAccessToken))
        {
            throw new UnauthorizedAccessException("Failed to obtain Google access token.");
        }

        var userInfoRequest = new HttpRequestMessage(HttpMethod.Get, "https://www.googleapis.com/oauth2/v3/userinfo");
        userInfoRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", googleAccessToken);

        var userInfoResponse = await client.SendAsync(userInfoRequest);
        var userInfoBody = await userInfoResponse.Content.ReadAsStringAsync();

        if (!userInfoResponse.IsSuccessStatusCode)
        {
            throw new UnauthorizedAccessException($"Failed to fetch Google profile information: {userInfoBody}");
        }

        using var userJsonDoc = JsonDocument.Parse(userInfoBody);
        var email = userJsonDoc.RootElement.TryGetProperty("email", out var emailProp)
            ? emailProp.GetString()
            : null;

        if (string.IsNullOrWhiteSpace(email))
        {
            throw new UnauthorizedAccessException("Google account does not provide an email address.");
        }

        var emailVerified = userJsonDoc.RootElement.TryGetProperty("email_verified", out var evProp) &&
            (evProp.ValueKind == JsonValueKind.True || (evProp.ValueKind == JsonValueKind.String && bool.TryParse(evProp.GetString(), out var evBool) && evBool));

        if (!emailVerified)
        {
            throw new UnauthorizedAccessException("Google email is not verified.");
        }

        var name = userJsonDoc.RootElement.TryGetProperty("name", out var nameProp)
            ? nameProp.GetString()
            : null;

        var picture = userJsonDoc.RootElement.TryGetProperty("picture", out var picProp)
            ? picProp.GetString()
            : null;

        var user = await _userRepository.GetByEmailAsync(email);
        if (user == null)
        {
            throw new KeyNotFoundException("Account not found. Please register first with your email and password before signing in with Google.");
        }

        var userSession = user.Session ?? await _userRepository.GetSessionByUserIdAsync(user.Id);
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
                IsActive = true,
                AccountVerify = new List<AccountVerifyEntry>(),
                Sessions = new List<SessionEntry>()
            };
            await _userRepository.AddSessionAsync(userSession);
        }

        bool userChanged = false;
        if (string.IsNullOrEmpty(user.ProfilePictureUrl) && !string.IsNullOrEmpty(picture))
        {
            user.ProfilePictureUrl = picture;
            userChanged = true;
        }
        if (string.IsNullOrEmpty(user.Name) && !string.IsNullOrEmpty(name))
        {
            user.Name = name;
            userChanged = true;
        }
        if (userChanged)
        {
            await _userRepository.UpdateAsync(user);
        }

        if (userSession.Sessions == null)
        {
            userSession.Sessions = new List<SessionEntry>();
        }

        var now = DateTime.UtcNow;
        CleanExpiredData(userSession, now);

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
            IsActive = true,
            AuthType = "Google"
        };

        userSession.Sessions.Add(sessionEntry);
        await _userRepository.UpdateSessionAsync(userSession);

        bool hasName = !string.IsNullOrEmpty(user.Name);
        return (GenerateJwtToken(user), refreshToken, hasName, user);
    }
}
