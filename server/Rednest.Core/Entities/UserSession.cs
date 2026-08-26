namespace Rednest.Core.Entities;

public class UserSession
{
    public Guid UserId { get; set; }
    public string? RegistrationIp { get; set; }
    public bool TwoFactorEnabled { get; set; } = false;
    public bool Subscribe { get; set; } = false;
    public List<AccountVerifyEntry> AccountVerify { get; set; } = new();
    public List<SessionEntry> Sessions { get; set; } = new();

    public User User { get; set; } = null!;
}
