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

    public async Task<(string AccessToken, string RefreshToken, bool HasName)> AuthenticateOrRegisterAsync(LoginRequest request, string? ipAddress)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email);
        
        if (user == null)
        {
            user = new User
            {
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                RegistrationIp = ipAddress,
                LastLoginIp = ipAddress
            };
            await _userRepository.AddAsync(user);
        }
        else
        {
            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                throw new UnauthorizedAccessException("Invalid credentials");
            }
            
            user.LastLoginIp = ipAddress;
            await _userRepository.UpdateAsync(user);
        }

        var refreshToken = GenerateRefreshToken();
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(30);
        await _userRepository.UpdateAsync(user);

        bool hasName = !string.IsNullOrEmpty(user.Name);
        return (GenerateJwtToken(user), refreshToken, hasName);
    }

    public async Task<(string AccessToken, string RefreshToken)> RefreshTokenAsync(string refreshToken)
    {
        var user = await _userRepository.GetByRefreshTokenAsync(refreshToken);
        if (user == null || user.RefreshTokenExpiryTime <= DateTime.UtcNow)
        {
            throw new UnauthorizedAccessException("Invalid or expired refresh token");
        }

        var newAccessToken = GenerateJwtToken(user);
        var newRefreshToken = GenerateRefreshToken();

        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(30);
        await _userRepository.UpdateAsync(user);

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
            expires: DateTime.UtcNow.AddMinutes(30),
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
