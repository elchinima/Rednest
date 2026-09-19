namespace Rednest.Core.Entities;

public enum CashboxPayMethod
{
    Card = 0,
    Cash = 1
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

public class Cashbox
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public CashboxPayMethod PayMethod { get; set; }
    public List<CashboxProductItem> Products { get; set; } = new();
    public CashboxPaidDetails Paid { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
