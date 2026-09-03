namespace Rednest.Api.Helpers;

public static class SecurityVerificationHelper
{
    public const string CookieName = "user_security_token";
    public const int ExpirationMinutes = 30;

    private static string GetSigningKey()
    {
        var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? "super_secret_key_that_is_at_least_32_chars_long";
        return $"security_verification_key_{jwtSecret}";
    }

    public static string GenerateSignedToken(string userId)
    {
        var key = Encoding.UTF8.GetBytes(GetSigningKey());
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var payload = $"{userId}:{timestamp}";
        var payloadBytes = Encoding.UTF8.GetBytes(payload);
        var hash = HMACSHA256.HashData(key, payloadBytes);
        var signature = Convert.ToBase64String(hash);
        return $"{payload}:{signature}";
    }

    public static bool ValidateToken(string? token, string expectedUserId)
    {
        if (string.IsNullOrWhiteSpace(token))
            return false;

        try
        {
            var parts = token.Split(':');
            if (parts.Length != 3)
                return false;

            var userId = parts[0];
            var timestampStr = parts[1];
            var signature = parts[2];

            if (!string.Equals(userId, expectedUserId, StringComparison.OrdinalIgnoreCase))
                return false;

            if (!long.TryParse(timestampStr, out var timestamp))
                return false;

            var tokenTime = DateTimeOffset.FromUnixTimeSeconds(timestamp);
            if (DateTimeOffset.UtcNow - tokenTime > TimeSpan.FromMinutes(ExpirationMinutes))
                return false;

            var key = Encoding.UTF8.GetBytes(GetSigningKey());
            var payload = $"{userId}:{timestampStr}";
            var payloadBytes = Encoding.UTF8.GetBytes(payload);
            var expectedHash = HMACSHA256.HashData(key, payloadBytes);
            var expectedSignature = Convert.ToBase64String(expectedHash);

            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(signature),
                Encoding.UTF8.GetBytes(expectedSignature));
        }
        catch
        {
            return false;
        }
    }

    public static CookieOptions SecurityCookieOptions() => new()
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.None,
        Path = "/",
        Expires = DateTimeOffset.UtcNow.AddMinutes(ExpirationMinutes)
    };

    public static void AppendSecurityCookie(HttpResponse response, string userId)
    {
        var token = GenerateSignedToken(userId);
        response.Cookies.Append(CookieName, token, SecurityCookieOptions());
    }

    public static void DeleteSecurityCookie(HttpResponse response)
    {
        response.Cookies.Delete(CookieName, SecurityCookieOptions());
    }
}
