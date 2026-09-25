namespace Rednest.Core.Entities;

public enum CashboxPayMethod
{
    Card = 0,
    Cash = 1
}

public enum CashboxStatus
{
    Success = 0,
    Cancelled = 1,
    Refunded = 2,
    Pending = 3,
    Processing = 4
}

public class CashboxProductItem
{
    public Guid ProductId { get; set; }
    public int Quantity { get; set; }
}

public class CashboxPaidDetails
{
    public decimal InitialAmount { get; set; }
    public string? PromoCodeId { get; set; }
    public decimal TotalAmount { get; set; }
}

public class CashboxEditedInfo
{
    public Guid UserId { get; set; }
    public DateTime Date { get; set; }
}

public class CashboxDescription
{
    public string? Note { get; set; }
    public CashboxEditedInfo? Edited { get; set; }
}

public class Cashbox
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public CashboxPayMethod PayMethod { get; set; }
    public List<CashboxProductItem> Products { get; set; } = new();
    public CashboxPaidDetails Paid { get; set; } = new();
    public CashboxStatus Status { get; set; } = CashboxStatus.Success;
    public CashboxDescription Description { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

