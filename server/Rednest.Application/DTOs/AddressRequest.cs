namespace Rednest.Application.DTOs;

public class AddressRequest
{
    public string? Title { get; set; }
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string? Apartment { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public bool IsDefault { get; set; } = false;
}
