namespace Rednest.Core.Entities;

public enum PaymentMethod
{
    CashDeskCash = 0,
    CashDeskCard = 1,
    OnlineBalance = 2,
    OnlineCardDetails = 3,
    OnlineStripe = 4,
    OnlineGooglePay = 5
}

public class OrderProductItem
{
    public Guid ProductId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

public class OrderPaymentDetails
{
    public PaymentMethod PaymentMethod { get; set; }
    public decimal OriginalTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string? PromoCode { get; set; }
    public string? PromoPrizeName { get; set; }
    public string? PaymentIntentId { get; set; }
}

public class OrderNotes
{
    public string? Comment { get; set; }
    public string? CustomerNote { get; set; }
    public string? KitchenNote { get; set; }

    [JsonExtensionData]
    public Dictionary<string, JsonElement>? ExtensionData { get; set; }
}

public class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "Pending Payment";
    public List<OrderProductItem> Items { get; set; } = new();
    public OrderPaymentDetails Payment { get; set; } = new();
    public OrderNotes Notes { get; set; } = new();
}

public class OrderEntry
{
}
