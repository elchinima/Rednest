namespace Rednest.Core.Entities;

public class NewsletterLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Subject { get; set; } = string.Empty;
    public string? Preheader { get; set; }
    public string? Badge { get; set; }
    public string? Heading { get; set; }
    public string ContentHtml { get; set; } = string.Empty;
    public string? PlainText { get; set; }
    public string? ButtonText { get; set; }
    public string? ButtonUrl { get; set; }
    public string SenderName { get; set; } = "Rednest";
    public string SenderEmail { get; set; } = "noreply@rednest.com";
    public Guid SentByAdminId { get; set; }
    public string? SentByAdminName { get; set; }
    public int RecipientCount { get; set; } = 0;
    public int SuccessCount { get; set; } = 0;
    public int FailedCount { get; set; } = 0;
    public string Status { get; set; } = "Sent"; // "Sent", "PartiallySent", "Failed"
    public string? ErrorMessage { get; set; }
    public List<string> RecipientEmails { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
