namespace Rednest.Application.Interfaces;

public interface IEmailService
{
    Task SendTwoFactorCodeAsync(string toEmail, string code);
}
