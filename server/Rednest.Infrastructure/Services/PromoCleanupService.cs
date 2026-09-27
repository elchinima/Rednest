namespace Rednest.Infrastructure.Services;

public class PromoCleanupService : BackgroundService, IPromoCleanupService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PromoCleanupService> _logger;

    public PromoCleanupService(
        IServiceScopeFactory scopeFactory,
        ILogger<PromoCleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("PromoCleanupService started.");

        try
        {
            await CleanupExpiredPromosAsync(stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            return;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Initial cleanup in PromoCleanupService failed.");
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            var delay = GetDelayUntilNextUtcMidnight();
            var nextRunUtc = DateTime.UtcNow.Add(delay);
            var nextRunBaku = nextRunUtc.AddHours(4);

            _logger.LogInformation(
                "PromoCleanupService: Next run scheduled at {NextRunUtc:yyyy-MM-dd HH:mm:ss} UTC ({NextRunBaku:yyyy-MM-dd HH:mm:ss} Baku time). Delay: {Hours}h {Minutes}m {Seconds}s.",
                nextRunUtc, nextRunBaku, (int)delay.TotalHours, delay.Minutes, delay.Seconds);

            try
            {
                await Task.Delay(delay, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }

            try
            {
                await CleanupExpiredPromosAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during scheduled promo cleanup.");
            }
        }

        _logger.LogInformation("PromoCleanupService stopped.");
    }

    public async Task<int> CleanupExpiredPromosAsync(CancellationToken cancellationToken = default)
    {
        var nowUtc = DateTime.UtcNow;
        var cutoff = DateTime.SpecifyKind(nowUtc.AddDays(-7), DateTimeKind.Utc);
        var minValidDate = DateTime.SpecifyKind(new DateTime(2020, 1, 1, 0, 0, 0), DateTimeKind.Utc);

        _logger.LogInformation("PromoCleanupService running check: deleting promos expired on or before {Cutoff:yyyy-MM-dd HH:mm:ss} UTC (7 days past expiry).", cutoff);

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        List<UserPromo> expiredPromos;
        try
        {
            expiredPromos = await db.UserPromos
                .Where(p => p.Dates.ExpiresAt >= minValidDate && p.Dates.ExpiresAt <= cutoff)
                .ToListAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "LINQ query on Dates.ExpiresAt failed; falling back to direct SQL query.");
            expiredPromos = await db.UserPromos
                .FromSqlInterpolated($"SELECT * FROM \"UserPromos\" WHERE \"Dates\"->>'ExpiresAt' IS NOT NULL AND (\"Dates\"->>'ExpiresAt')::timestamptz <= {cutoff}")
                .ToListAsync(cancellationToken);
        }

        if (expiredPromos.Count == 0)
        {
            _logger.LogInformation("PromoCleanupService: No expired promos older than 7 days found.");
            return 0;
        }

        var deletedCodes = expiredPromos
            .Select(p => !string.IsNullOrWhiteSpace(p.Codes?.PromoCode) ? p.Codes.PromoCode : p.Id.ToString())
            .ToList();

        _logger.LogInformation(
            "PromoCleanupService: Found {Count} promo(s) to delete (expired > 7 days ago): {Codes}",
            expiredPromos.Count, string.Join(", ", deletedCodes));

        db.UserPromos.RemoveRange(expiredPromos);
        await db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("PromoCleanupService: Successfully deleted {Count} promo(s).", expiredPromos.Count);
        return expiredPromos.Count;
    }

    private static TimeSpan GetDelayUntilNextUtcMidnight()
    {
        var now = DateTime.UtcNow;
        var nextMidnight = now.Date.AddDays(1).AddSeconds(5);
        var delay = nextMidnight - now;
        return delay > TimeSpan.Zero ? delay : TimeSpan.FromDays(1);
    }
}
