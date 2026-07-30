namespace Rednest.Core.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public string? RegistrationIp { get; set; }
    public string? LastLoginIp { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiryTime { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
