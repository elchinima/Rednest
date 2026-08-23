namespace Rednest.Core.Entities;

public enum PaymentMethod
{
    CashDeskCash = 0,
    CashDeskCard = 1,
    CashDeskNfc = 2,
    OnlineBalance = 3,
    OnlineCardDetails = 4,
    OnlineStripe = 5,
    OnlineGooglePay = 6,
    OnlineApplePay = 7
}

public class OrderProductItem
{
    public Guid ProductId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

public class OrderEntry
{
    public List<OrderProductItem> Products { get; set; } = new();
    public decimal OriginalTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string? PromoCode { get; set; }
    public string? PromoPrizeName { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
}

public class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "Pending Payment";
    public List<OrderEntry> Orders { get; set; } = new();
}
