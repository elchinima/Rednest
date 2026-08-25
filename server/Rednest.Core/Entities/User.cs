namespace Rednest.Core.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public string? ProfilePictureUrl { get; set; }
    public decimal Balance { get; set; } = 0.00m;
    public List<UserAddress> Addresses { get; set; } = new();
    public List<UserPaymentMethod> PaymentMethods { get; set; } = new();

    public UserSession? Session { get; set; }
    public ICollection<UserPromo> Promos { get; set; } = new List<UserPromo>();
}
