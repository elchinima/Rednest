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
    Cancelled = 2,
    Pending = 3
}

public enum ReviewLanguage
{
    Russian = 0,
    English = 1,
    Azerbaijani = 2
}

public class ReviewDetails
{
    public decimal Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
}

public class ModerationResult
{
    public bool IsClean { get; set; }
    public bool HasOffensiveContent { get; set; }
    public bool HasAdvertising { get; set; }
    public bool HasLinks { get; set; }
    public bool HasWrongLanguage { get; set; }
    public string DetectedLanguage { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public DateTime ModeratedAt { get; set; }
}

public class Review
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid OrderId { get; set; }
    public ReviewCategory Category { get; set; }
    public ReviewStatus Status { get; set; } = ReviewStatus.Pending;
    public ReviewLanguage Language { get; set; } = ReviewLanguage.Russian;
    public ReviewDetails ReviewData { get; set; } = new();
    public ModerationResult? Moderation { get; set; }
    public List<Guid> Likes { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow.AddHours(4);
}
