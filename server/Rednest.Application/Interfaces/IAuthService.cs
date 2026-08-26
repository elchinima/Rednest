using Rednest.Application.DTOs;
using Rednest.Core.Entities;

namespace Rednest.Application.Interfaces;

public interface IAuthService
{
    Task<(bool Requires2FA, string? AccessToken, string? RefreshToken, bool HasName, User? User)> AuthenticateOrRegisterAsync(
        LoginRequest request, 
        string? ipAddress, 
        string? userAgent = null, 
        string? platformVersion = null,
        string? deviceModel = null);

    Task<(string AccessToken, string RefreshToken, bool HasName, User User)> VerifyTwoFactorAsync(
        VerifyTwoFactorRequest request,
        string? ipAddress,
        string? userAgent = null,
        string? platformVersion = null,
        string? deviceModel = null);

    Task ResendTwoFactorCodeAsync(string email);

    Task<bool> ToggleTwoFactorAsync(Guid userId, bool? enabled = null);

    Task RequestSubscriptionCodeAsync(string email);

    Task VerifySubscriptionCodeAsync(string email, string code);

    Task<(string AccessToken, string RefreshToken)> RefreshTokenAsync(
        string refreshToken, 
        string? ipAddress = null, 
        string? userAgent = null, 
        string? platformVersion = null,
        string? deviceModel = null);

    Task<List<UserSessionDto>> GetUserSessionsAsync(Guid userId, string? currentRefreshToken);

    Task<bool> RevokeSessionAsync(Guid userId, string sessionId, string? currentRefreshToken);
}
