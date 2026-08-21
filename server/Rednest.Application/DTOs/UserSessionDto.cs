namespace Rednest.Application.DTOs;

public class UserSessionDto
{
    public string Id { get; set; } = string.Empty;
    public string DeviceName { get; set; } = "Unknown Device";
    public string DeviceType { get; set; } = "Desktop";
    public string OperatingSystem { get; set; } = "Unknown OS";
    public string Country { get; set; } = "Unknown";
    public string? LastLoginIp { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastActiveAt { get; set; }
    public bool IsActive { get; set; }
    public bool IsCurrent { get; set; }
}
