namespace Rednest.Core.Entities;

public class UserPromo
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string PromoCode { get; set; } = string.Empty;
    public string PrizeName { get; set; } = string.Empty;
    public string PrizeDescription { get; set; } = string.Empty;
    public string BarCode { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime ActivatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }

    public User User { get; set; } = null!;
}
