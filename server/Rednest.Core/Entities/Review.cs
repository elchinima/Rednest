namespace Rednest.Core.Entities;

public enum ReviewCategory
{
    Delivery = 0,
    Products = 1,
    Service = 2,
    Staff = 3
}

public enum ReviewStatus
{
    Published = 0,
    Verification = 1,
    Cancelled = 2
}

public class ReviewDetails
{
    public decimal Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
}

public class Review
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid OrderId { get; set; }
    public ReviewCategory Category { get; set; }
    public ReviewStatus Status { get; set; } = ReviewStatus.Published;
    public ReviewDetails ReviewData { get; set; } = new();
    public List<Guid> Likes { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

