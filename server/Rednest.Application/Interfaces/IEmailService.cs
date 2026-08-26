namespace Rednest.Application.Interfaces;

public interface IEmailService
{
    Task SendTwoFactorCodeAsync(string toEmail, string code);
    Task SendSubscriptionCodeAsync(string toEmail, string code);
}
