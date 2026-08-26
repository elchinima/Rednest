namespace Rednest.Application.DTOs;

public class AddressRequest
{
    public string Title { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? Apartment { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public bool IsDefault { get; set; } = false;
}
