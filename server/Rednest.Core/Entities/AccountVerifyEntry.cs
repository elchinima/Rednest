namespace Rednest.Core.Entities;

public class AccountVerifyEntry
{
    public string Type { get; set; } = "2FA";
    public string Code { get; set; } = string.Empty;
    public int Expire { get; set; } = 15;
    public DateTime CreateData { get; set; } = DateTime.UtcNow;
}
