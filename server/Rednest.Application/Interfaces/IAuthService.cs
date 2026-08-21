using Rednest.Application.DTOs;

namespace Rednest.Application.Interfaces;

public interface IAuthService
{
    Task<(string AccessToken, string RefreshToken, bool HasName)> AuthenticateOrRegisterAsync(
        LoginRequest request, 
        string? ipAddress, 
        string? userAgent = null, 
        string? platformVersion = null,
        string? deviceModel = null);

    Task<(string AccessToken, string RefreshToken)> RefreshTokenAsync(
        string refreshToken, 
        string? ipAddress = null, 
        string? userAgent = null, 
        string? platformVersion = null,
        string? deviceModel = null);

    Task<List<UserSessionDto>> GetUserSessionsAsync(Guid userId, string? currentRefreshToken);

    Task<bool> RevokeSessionAsync(Guid userId, string sessionId, string? currentRefreshToken);
}
