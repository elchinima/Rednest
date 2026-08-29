namespace Rednest.Infrastructure.Services;

public class BrevoEmailService : IEmailService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public BrevoEmailService(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    public async Task SendTwoFactorCodeAsync(string toEmail, string code)
    {
        var apiKey = Environment.GetEnvironmentVariable("BREVO_API_KEY") 
                     ?? _configuration["BREVO_API_KEY"];

        if (string.IsNullOrWhiteSpace(apiKey) || apiKey.Contains("your-brevo-api-key"))
        {
            return;
        }

        var senderEmail = Environment.GetEnvironmentVariable("BREVO_SENDER_EMAIL") 
                          ?? _configuration["BREVO_SENDER_EMAIL"] 
                          ?? "noreply@rednest.com";
        var senderName = Environment.GetEnvironmentVariable("BREVO_SENDER_NAME") 
                         ?? _configuration["BREVO_SENDER_NAME"] 
                         ?? "Rednest";

        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Clear();
        client.DefaultRequestHeaders.Add("api-key", apiKey);
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var htmlContent = $@"<!DOCTYPE html>
<html>
<head>
  <meta charset=""utf-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
  <title>Your Rednest Verification Code</title>
</head>
<body style=""margin:0;padding:0;background-color:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;"">
  <table width=""100%"" border=""0"" cellspacing=""0"" cellpadding=""0"" style=""background-color:#0d0d0d;padding:40px 20px;"">
    <tr>
      <td align=""center"">
        <table width=""100%"" border=""0"" cellspacing=""0"" cellpadding=""0"" style=""max-width:480px;background:#141414;border:1px solid #262626;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.6);"">
          <tr>
            <td style=""padding:36px 32px 24px;text-align:center;background:linear-gradient(180deg, #1f1414 0%, #141414 100%);border-bottom:1px solid #222;"">
              <h1 style=""margin:0;font-size:26px;font-weight:800;letter-spacing:1px;color:#e53e3e;"">REDNEST</h1>
              <p style=""margin:8px 0 0;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#888;"">Two-Factor Authentication</p>
            </td>
          </tr>
          <tr>
            <td style=""padding:32px 32px 24px;text-align:center;"">
              <p style=""margin:0 0 20px;font-size:15px;line-height:1.5;color:#cccccc;"">
                Use the following 4-digit code to complete your sign in. This code is valid for <strong>15 minutes</strong>.
              </p>
              <div style=""display:inline-block;padding:16px 36px;background:#1c1414;border:1px solid #e53e3e44;border-radius:12px;margin:8px 0 24px;"">
                <span style=""font-size:36px;font-weight:800;letter-spacing:10px;color:#ff4d4d;font-family:'Courier New',Courier,monospace;"">{code}</span>
              </div>
              <p style=""margin:0 0 8px;font-size:13px;color:#777777;"">
                If you did not attempt to sign in to your Rednest account, please ignore this email or update your password immediately.
              </p>
            </td>
          </tr>
          <tr>
            <td style=""padding:20px 32px;background:#0f0f0f;border-top:1px solid #1f1f1f;text-align:center;"">
              <p style=""margin:0;font-size:11px;color:#555555;"">
                &copy; {DateTime.UtcNow.Year} Rednest. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";

        var payload = new
        {
            sender = new { name = senderName, email = senderEmail },
            to = new[] { new { email = toEmail } },
            subject = $"{code} is your Rednest verification code",
            htmlContent = htmlContent
        };

        var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var response = await client.PostAsync("https://api.brevo.com/v3/smtp/email", content);

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"Brevo API error: {err}");
        }
    }

    public async Task SendSubscriptionCodeAsync(string toEmail, string code)
    {
        var apiKey = Environment.GetEnvironmentVariable("BREVO_API_KEY") 
                     ?? _configuration["BREVO_API_KEY"];

        if (string.IsNullOrWhiteSpace(apiKey) || apiKey.Contains("your-brevo-api-key"))
        {
            return;
        }

        var senderEmail = Environment.GetEnvironmentVariable("BREVO_SENDER_EMAIL") 
                          ?? _configuration["BREVO_SENDER_EMAIL"] 
                          ?? "noreply@rednest.com";
        var senderName = Environment.GetEnvironmentVariable("BREVO_SENDER_NAME") 
                         ?? _configuration["BREVO_SENDER_NAME"] 
                         ?? "Rednest";

        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Clear();
        client.DefaultRequestHeaders.Add("api-key", apiKey);
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var htmlContent = $@"<!DOCTYPE html>
<html>
<head>
  <meta charset=""utf-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
  <title>Confirm Your Rednest Club Subscription</title>
</head>
<body style=""margin:0;padding:0;background-color:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;"">
  <table width=""100%"" border=""0"" cellspacing=""0"" cellpadding=""0"" style=""background-color:#0d0d0d;padding:40px 20px;"">
    <tr>
      <td align=""center"">
        <table width=""100%"" border=""0"" cellspacing=""0"" cellpadding=""0"" style=""max-width:480px;background:#141414;border:1px solid #262626;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.6);"">
          <tr>
            <td style=""padding:36px 32px 24px;text-align:center;background:linear-gradient(180deg, #1f1414 0%, #141414 100%);border-bottom:1px solid #222;"">
              <h1 style=""margin:0;font-size:26px;font-weight:800;letter-spacing:1px;color:#e53e3e;"">REDNEST CLUB</h1>
              <p style=""margin:8px 0 0;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#888;"">Newsletter Confirmation</p>
            </td>
          </tr>
          <tr>
            <td style=""padding:32px 32px 24px;text-align:center;"">
              <p style=""margin:0 0 20px;font-size:15px;line-height:1.5;color:#cccccc;"">
                Thank you for joining the Rednest Club! Enter the 4-digit code below to confirm your subscription. This code is valid for <strong>15 minutes</strong>.
              </p>
              <div style=""display:inline-block;padding:16px 36px;background:#1c1414;border:1px solid #e53e3e44;border-radius:12px;margin:8px 0 24px;"">
                <span style=""font-size:36px;font-weight:800;letter-spacing:10px;color:#ff4d4d;font-family:'Courier New',Courier,monospace;"">{code}</span>
              </div>
              <p style=""margin:0 0 8px;font-size:13px;color:#777777;"">
                If you did not request this subscription, please ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style=""padding:20px 32px;background:#0f0f0f;border-top:1px solid #1f1f1f;text-align:center;"">
              <p style=""margin:0;font-size:11px;color:#555555;"">
                &copy; {DateTime.UtcNow.Year} Rednest. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";

        var payload = new
        {
            sender = new { name = senderName, email = senderEmail },
            to = new[] { new { email = toEmail } },
            subject = $"{code} is your Rednest Club confirmation code",
            htmlContent = htmlContent
        };

        var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var response = await client.PostAsync("https://api.brevo.com/v3/smtp/email", content);

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"Brevo API error: {err}");
        }
    }
}
