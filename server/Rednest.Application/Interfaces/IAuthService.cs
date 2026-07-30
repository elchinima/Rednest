using Rednest.Application.DTOs;

namespace Rednest.Application.Interfaces;

public interface IAuthService
{
    Task<(string Token, bool HasName)> AuthenticateOrRegisterAsync(LoginRequest request, string? ipAddress);
}
