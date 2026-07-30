using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
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

    public async Task<string> AuthenticateOrRegisterAsync(LoginRequest request, string? ipAddress)
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

        return GenerateJwtToken(user);
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
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
