namespace Rednest.Core.Entities;

public class UserSession
{
    public Guid UserId { get; set; }
    public string? RegistrationIp { get; set; }
    public List<SessionEntry> Sessions { get; set; } = new();

    public User User { get; set; } = null!;
}
