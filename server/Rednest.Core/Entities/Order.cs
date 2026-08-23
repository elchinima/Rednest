namespace Rednest.Core.Entities;

public enum PaymentMethod
{
    CashDeskCard = 0,
    CashDeskCash = 1,
    OnlineStripe = 2,
    OnlineGooglePay = 3,
    OnlineCardDetails = 4
}

public class OrderProductItem
{
    public Guid ProductId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
}

public class OrderEntry
{
    public Guid OrderId { get; set; } = Guid.NewGuid();
    public string OrderNumber { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow.AddHours(4);
    public List<OrderProductItem> Products { get; set; } = new();
    public decimal OriginalTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string? PromoCode { get; set; }
    public string? PromoPrizeName { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public string Status { get; set; } = "Ожидание оплаты";
}

public class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public bool HasActiveOrder { get; set; } = false;
    public List<OrderEntry> Orders { get; set; } = new();
}
