namespace Rednest.Core.Entities;

public class UserAddress
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string? Apartment { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public bool IsDefault { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow.AddHours(4);
}
