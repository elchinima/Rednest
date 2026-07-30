using Rednest.Application.DTOs;

namespace Rednest.Application.Interfaces;

public interface IAuthService
{
    Task<string> AuthenticateOrRegisterAsync(LoginRequest request, string? ipAddress);
}
