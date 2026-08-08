namespace Rednest.Core.Entities;

public class PrizeInfo
{
    public string PrizeName { get; set; } = string.Empty;
    public string PrizeDescription { get; set; } = string.Empty;
}

public class PromoCodes
{
    public string PromoCode { get; set; } = string.Empty;
    public string BarCode { get; set; } = string.Empty;
}

public class PromoDates
{
    public DateTime ActivatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
}

public class UserPromo
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    
    public PromoCodes Codes { get; set; } = new PromoCodes();
    public PrizeInfo PrizeInfo { get; set; } = new PrizeInfo();
    public PromoDates Dates { get; set; } = new PromoDates();
    
    public bool IsActive { get; set; } = true;

    public User User { get; set; } = null!;
}
