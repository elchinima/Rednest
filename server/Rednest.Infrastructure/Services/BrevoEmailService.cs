namespace Rednest.Infrastructure.Services;

public class BrevoEmailService : IEmailService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<BrevoEmailService> _logger;

    public BrevoEmailService(
        IHttpClientFactory httpClientFactory, 
        IConfiguration configuration,
        ILogger<BrevoEmailService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    private (string apiKey, string senderEmail, string senderName) GetBrevoConfig(string? customSenderName = null)
    {
        var apiKey = Environment.GetEnvironmentVariable("BREVO_API_KEY") 
                     ?? _configuration["BREVO_API_KEY"];

        if (string.IsNullOrWhiteSpace(apiKey) || apiKey.Contains("your-brevo-api-key"))
        {
            throw new InvalidOperationException("BREVO_API_KEY is not configured in secret/.env or configuration.");
        }

        var senderEmail = Environment.GetEnvironmentVariable("BREVO_SENDER_EMAIL") 
                          ?? _configuration["BREVO_SENDER_EMAIL"] 
                          ?? "myrednest@gmail.com";

        var defaultSenderName = Environment.GetEnvironmentVariable("BREVO_SENDER_NAME") 
                                 ?? _configuration["BREVO_SENDER_NAME"] 
                                 ?? "Rednest";

        var actualSenderName = !string.IsNullOrWhiteSpace(customSenderName) 
            ? customSenderName.Trim() 
            : defaultSenderName;

        return (apiKey, senderEmail, actualSenderName);
    }

    public async Task SendTwoFactorCodeAsync(string toEmail, string code)
    {
        var (apiKey, senderEmail, senderName) = GetBrevoConfig();

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

        var client = _httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email");
        request.Headers.Add("api-key", apiKey);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        var response = await client.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            _logger.LogError("Brevo API 2FA error: {Error}", err);
            throw new InvalidOperationException($"Brevo API error: {err}");
        }
    }

    public async Task SendSubscriptionCodeAsync(string toEmail, string code)
    {
        var (apiKey, senderEmail, senderName) = GetBrevoConfig();

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

        var client = _httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email");
        request.Headers.Add("api-key", apiKey);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        var response = await client.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            _logger.LogError("Brevo API Subscription code error: {Error}", err);
            throw new InvalidOperationException($"Brevo API error: {err}");
        }
    }

    public async Task SendNewsletterEmailAsync(string toEmail, string subject, string htmlContent, string? senderName = null)
    {
        var (apiKey, senderEmail, actualSenderName) = GetBrevoConfig(senderName);

        var client = _httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email");
        request.Headers.Add("api-key", apiKey);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var payload = new
        {
            sender = new { name = actualSenderName, email = senderEmail },
            to = new[] { new { email = toEmail } },
            subject = subject,
            htmlContent = htmlContent
        };

        request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var response = await client.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            _logger.LogError("Brevo API Newsletter send error: {Error}", err);
            throw new InvalidOperationException($"Brevo API error: {err}");
        }
    }

    public string BuildNewsletterHtml(
        string subject,
        string? preheader,
        string? badge,
        string? heading,
        string bodyHtml,
        string? buttonText = null,
        string? buttonUrl = null,
        string? recipientName = null,
        string? recipientEmail = null)
    {
        var year = DateTime.UtcNow.Year.ToString();
        var safeRecipientName = !string.IsNullOrWhiteSpace(recipientName)
            ? recipientName.Trim()
            : (!string.IsNullOrWhiteSpace(recipientEmail) && recipientEmail.Contains('@')
                ? char.ToUpper(recipientEmail.Split('@')[0][0]) + recipientEmail.Split('@')[0][1..]
                : "Valued Member");
        var safeRecipientEmail = !string.IsNullOrWhiteSpace(recipientEmail) ? recipientEmail.Trim() : "";

        var processedSubject = ProcessTemplateTags(subject, safeRecipientName, safeRecipientEmail, year);
        var processedPreheader = ProcessTemplateTags(preheader, safeRecipientName, safeRecipientEmail, year);
        var processedBadge = ProcessTemplateTags(badge, safeRecipientName, safeRecipientEmail, year);
        var processedHeading = ProcessTemplateTags(heading, safeRecipientName, safeRecipientEmail, year);
        var processedBody = ProcessTemplateTags(bodyHtml, safeRecipientName, safeRecipientEmail, year);
        var processedButtonText = ProcessTemplateTags(buttonText, safeRecipientName, safeRecipientEmail, year);
        var processedButtonUrl = ProcessTemplateTags(buttonUrl, safeRecipientName, safeRecipientEmail, year);

        var preheaderHtml = !string.IsNullOrWhiteSpace(processedPreheader)
            ? $@"<div style=""display:none;font-size:1px;color:#0d0d0d;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;"">{System.Net.WebUtility.HtmlEncode(processedPreheader)}</div>"
            : "";

        var badgeHtml = !string.IsNullOrWhiteSpace(processedBadge)
            ? $@"<div style=""display:inline-block;padding:5px 14px;background:rgba(229,62,62,0.15);border:1px solid #e53e3e55;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#ff5a5a;margin-bottom:14px;"">{System.Net.WebUtility.HtmlEncode(processedBadge)}</div>"
            : "";

        var headingHtml = !string.IsNullOrWhiteSpace(processedHeading)
            ? $@"<h2 style=""margin:0 0 16px 0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;letter-spacing:-0.3px;"">{System.Net.WebUtility.HtmlEncode(processedHeading)}</h2>"
            : "";

        var buttonHtml = (!string.IsNullOrWhiteSpace(processedButtonText) && !string.IsNullOrWhiteSpace(processedButtonUrl))
            ? $@"<div style=""margin:32px 0 16px;text-align:center;"">
                  <a href=""{System.Net.WebUtility.HtmlEncode(processedButtonUrl)}"" target=""_blank"" style=""display:inline-block;padding:14px 34px;background:linear-gradient(135deg, #e53e3e 0%, #c53030 100%);color:#ffffff;font-size:15px;font-weight:700;letter-spacing:0.5px;text-decoration:none;border-radius:12px;box-shadow:0 6px 20px rgba(229,62,62,0.35);"">
                    {System.Net.WebUtility.HtmlEncode(processedButtonText)}
                  </a>
                </div>"
            : "";

        return $@"<!DOCTYPE html>
<html lang=""en"">
<head>
  <meta charset=""utf-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
  <title>{System.Net.WebUtility.HtmlEncode(processedSubject)}</title>
</head>
<body style=""margin:0;padding:0;background-color:#0d0d10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#e2e8f0;"">
  {preheaderHtml}
  <table width=""100%"" border=""0"" cellspacing=""0"" cellpadding=""0"" style=""background-color:#0d0d10;padding:40px 16px;"">
    <tr>
      <td align=""center"">
        <table width=""100%"" border=""0"" cellspacing=""0"" cellpadding=""0"" style=""max-width:580px;background:#141417;border:1px solid #23232a;border-radius:16px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.6);"">
          <tr>
            <td style=""padding:32px 28px 24px;text-align:center;background:radial-gradient(ellipse at top, #261214 0%, #141417 100%);border-bottom:1px solid #202028;"">
              <h1 style=""margin:0;font-size:28px;font-weight:900;letter-spacing:3px;color:#e53e3e;"">REDNEST</h1>
              <p style=""margin:6px 0 0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#8e8ea0;"">Exclusive Member Newsletter</p>
            </td>
          </tr>
          <tr>
            <td style=""padding:36px 32px 28px;color:#cbd5e1;font-size:15px;line-height:1.7;"">
              {badgeHtml}
              {headingHtml}
              <div style=""color:#cbd5e1;font-size:15px;line-height:1.7;"">
                {processedBody}
              </div>
              {buttonHtml}
            </td>
          </tr>
          <tr>
            <td style=""padding:24px 32px;background:#0d0d10;border-top:1px solid #1c1c22;text-align:center;color:#6b7280;font-size:12px;line-height:1.6;"">
              <p style=""margin:0 0 6px 0;"">You are receiving this email because you subscribed to the Rednest Club.</p>
              <p style=""margin:0;"">&copy; {year} Rednest Coffee & Lounge. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";
    }

    private static string ProcessTemplateTags(string? text, string recipientName, string recipientEmail, string year)
    {
        if (string.IsNullOrEmpty(text))
            return string.Empty;

        return System.Text.RegularExpressions.Regex.Replace(text, @"\{name\}", recipientName, System.Text.RegularExpressions.RegexOptions.IgnoreCase)
            .Replace("{email}", recipientEmail, StringComparison.OrdinalIgnoreCase)
            .Replace("{year}", year, StringComparison.OrdinalIgnoreCase);
    }
}
