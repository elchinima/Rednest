namespace Rednest.Application.DTOs;

public class PaymentMethodRequest
{
    public string? CardName { get; set; }
    public string? CardholderName { get; set; }
    public string CardNumber { get; set; } = string.Empty;
    public string ExpiryDate { get; set; } = string.Empty;
    public string Cvc { get; set; } = string.Empty;
    public bool IsDefault { get; set; } = false;
}
