namespace Rednest.Core.Entities;

public class SessionEntry
{
    public string RefreshToken { get; set; } = string.Empty;
    public string? PreviousRefreshToken { get; set; }
    public DateTime? PreviousTokenRotatedAt { get; set; }
    public DateTime RefreshTokenExpiryTime { get; set; }
    public string? LastLoginIp { get; set; }
    public string? OperatingSystem { get; set; }
    public string? DeviceName { get; set; }
    public string? DeviceType { get; set; }
    public string? UserAgent { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastActiveAt { get; set; }
    public bool? IsActive { get; set; }
}
