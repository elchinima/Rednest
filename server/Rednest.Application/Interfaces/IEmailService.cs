namespace Rednest.Application.Interfaces;

public interface IEmailService
{
    Task SendTwoFactorCodeAsync(string toEmail, string code);
    Task SendSubscriptionCodeAsync(string toEmail, string code);
    Task SendNewsletterEmailAsync(string toEmail, string subject, string htmlContent, string? senderName = null);
    string BuildNewsletterHtml(string subject, string? preheader, string? badge, string? heading, string bodyHtml, string? buttonText = null, string? buttonUrl = null, string? recipientName = null, string? recipientEmail = null);
}
