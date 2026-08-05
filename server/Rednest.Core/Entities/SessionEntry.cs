namespace Rednest.Core.Entities;

public class SessionEntry
{
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime RefreshTokenExpiryTime { get; set; }
    public string? LastLoginIp { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
