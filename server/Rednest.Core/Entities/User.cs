namespace Rednest.Core.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public string? ProfilePictureUrl { get; set; }

    public UserSession? Session { get; set; }
}
