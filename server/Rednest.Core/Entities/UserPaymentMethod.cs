namespace Rednest.Core.Entities;

public class UserPaymentMethod
{
    public int Id { get; set; }
    public string? CardName { get; set; }
    public string CardholderName { get; set; } = string.Empty;
    public string CardNumber { get; set; } = string.Empty;
    public string Last4 { get; set; } = string.Empty;
    public string ExpiryDate { get; set; } = string.Empty;
    public string Cvc { get; set; } = string.Empty;
    public string CardBrand { get; set; } = string.Empty;
    public bool IsDefault { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow.AddHours(4);
}
