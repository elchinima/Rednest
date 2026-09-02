namespace Rednest.Infrastructure.Services;

public class KeepAliveService : BackgroundService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<KeepAliveService> _logger;

    public KeepAliveService(
        IHttpClientFactory httpClientFactory,
        ILogger<KeepAliveService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var baseUrl = Environment.GetEnvironmentVariable("BASE_URL")
                    ?? Environment.GetEnvironmentVariable("RENDER_EXTERNAL_URL")
                    ?? Environment.GetEnvironmentVariable("APP_URL");

                if (string.IsNullOrWhiteSpace(baseUrl))
                {
                    await Task.Delay(TimeSpan.FromMinutes(10), stoppingToken);
                    continue;
                }

                baseUrl = baseUrl.TrimEnd('/');
                var pingUrl = $"{baseUrl}/api/ping";

                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(30);

                var response = await client.GetAsync(pingUrl, stoppingToken);
                _logger.LogInformation("KeepAlive ping to {Url} completed with status {StatusCode}", pingUrl, response.StatusCode);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "KeepAlive ping failed");
            }

            await Task.Delay(TimeSpan.FromMinutes(10), stoppingToken);
        }
    }
}
