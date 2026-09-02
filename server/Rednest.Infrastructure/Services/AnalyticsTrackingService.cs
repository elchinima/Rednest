namespace Rednest.Infrastructure.Services;

public class AnalyticsTrackingService : BackgroundService, IAnalyticsTrackingService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AnalyticsTrackingService> _logger;
    private int _tickCount;

    public AnalyticsTrackingService(
        IServiceScopeFactory scopeFactory,
        IHttpClientFactory httpClientFactory,
        ILogger<AnalyticsTrackingService> logger)
    {
        _scopeFactory = scopeFactory;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await TrackAnalyticsAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred in AnalyticsTrackingService");
            }

            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }

    public async Task TrackAnalyticsAsync(CancellationToken stoppingToken = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var utcNow = DateTime.UtcNow;
        var bakuNow = utcNow.AddHours(4);
        var monthYear = bakuNow.ToString("MMMM, yyyy", CultureInfo.InvariantCulture);
        var todayDate = bakuNow.ToString("yyyy-MM-dd");

        var record = await context.Analytics.FirstOrDefaultAsync(a => a.MonthYear == monthYear, stoppingToken);
        var isNew = false;
        if (record == null)
        {
            record = new Analytics
            {
                MonthYear = monthYear,
                CreatedAt = bakuNow,
                UpdatedAt = bakuNow
            };
            context.Analytics.Add(record);
            isNew = true;
        }

        var users = await context.Users
            .Include(u => u.Session)
            .AsNoTracking()
            .ToListAsync(stoppingToken);

        var activeThreshold = utcNow.AddMinutes(-15);
        var onlineUsersCount = users.Count(u =>
            u.Session != null &&
            u.Session.IsActive != false &&
            u.Session.Sessions != null &&
            u.Session.Sessions.Any(s =>
                s.IsActive != false &&
                s.RefreshTokenExpiryTime > utcNow &&
                (s.LastActiveAt ?? s.CreatedAt) >= activeThreshold
            ));

        var changed = isNew;

        var peakData = new DailyPeakOnlineData
        {
            MonthlyPeak = record.DailyPeakOnline.MonthlyPeak,
            TodayPeak = record.DailyPeakOnline.TodayPeak,
            UpdatedAt = record.DailyPeakOnline.UpdatedAt,
            Days = record.DailyPeakOnline.Days != null
                ? new List<DailyPeakRecord>(record.DailyPeakOnline.Days)
                : new List<DailyPeakRecord>()
        };

        var todayRecord = peakData.Days.FirstOrDefault(d => d.Date == todayDate);
        if (todayRecord == null)
        {
            todayRecord = new DailyPeakRecord
            {
                Date = todayDate,
                PeakOnline = onlineUsersCount,
                RecordedAt = bakuNow
            };
            peakData.Days.Add(todayRecord);
            peakData.TodayPeak = onlineUsersCount;
            if (onlineUsersCount > peakData.MonthlyPeak)
            {
                peakData.MonthlyPeak = onlineUsersCount;
            }
            peakData.UpdatedAt = bakuNow;
            record.DailyPeakOnline = peakData;
            changed = true;
        }
        else if (onlineUsersCount > todayRecord.PeakOnline)
        {
            todayRecord.PeakOnline = onlineUsersCount;
            todayRecord.RecordedAt = bakuNow;
            peakData.TodayPeak = onlineUsersCount;
            if (onlineUsersCount > peakData.MonthlyPeak)
            {
                peakData.MonthlyPeak = onlineUsersCount;
            }
            peakData.UpdatedAt = bakuNow;
            record.DailyPeakOnline = peakData;
            changed = true;
        }

        var startOfBakuMonth = new DateTime(bakuNow.Year, bakuNow.Month, 1, 0, 0, 0, DateTimeKind.Unspecified);
        var endOfBakuMonth = startOfBakuMonth.AddMonths(1);
        var startUtc = DateTime.SpecifyKind(startOfBakuMonth.AddHours(-4), DateTimeKind.Utc);
        var endUtc = DateTime.SpecifyKind(endOfBakuMonth.AddHours(-4), DateTimeKind.Utc);

        var monthlyOrders = await context.Orders
            .AsNoTracking()
            .Where(o => o.CreatedAt >= startUtc && o.CreatedAt < endUtc)
            .ToListAsync(stoppingToken);

        var validMonthlyOrders = monthlyOrders
            .Where(o => string.IsNullOrWhiteSpace(o.Status) || !o.Status.Contains("Cancel", StringComparison.OrdinalIgnoreCase))
            .ToList();

        var productsSold = validMonthlyOrders
            .Where(o => o.Items != null)
            .SelectMany(o => o.Items)
            .Sum(i => i.Quantity);

        var monthlyProfit = validMonthlyOrders
            .Sum(o => o.Payment != null ? o.Payment.TotalAmount : 0m);

        var monthlyPromoDiscounts = validMonthlyOrders
            .Sum(o => o.Payment != null ? o.Payment.DiscountAmount : 0m);

        var registrations = users.Count(u =>
        {
            var regDate = u.Session?.Sessions?
                .OrderBy(s => s.CreatedAt)
                .Select(s => (DateTime?)s.CreatedAt)
                .FirstOrDefault();

            if (!regDate.HasValue) return false;
            return regDate.Value >= startUtc && regDate.Value < endUtc;
        });

        var allReviews = await context.Reviews
            .AsNoTracking()
            .ToListAsync(stoppingToken);

        var monthlyReviews = allReviews.Where(r =>
        {
            var inBakuDirect = r.CreatedAt >= startOfBakuMonth && r.CreatedAt < endOfBakuMonth;
            var inUtcRange = r.CreatedAt >= startUtc && r.CreatedAt < endUtc;
            return inBakuDirect || inUtcRange;
        }).ToList();

        var reviewersCount = monthlyReviews.Select(r => r.UserId).Distinct().Count();
        var averageRating = monthlyReviews.Count > 0
            ? Math.Round(monthlyReviews.Average(r => r.ReviewData != null ? r.ReviewData.Rating : 0m), 2)
            : 0.0m;

        var allPromos = await context.UserPromos
            .AsNoTracking()
            .ToListAsync(stoppingToken);

        var promosCreated = allPromos.Count(p =>
        {
            var created = p.Dates != null ? p.Dates.ActivatedAt : DateTime.MinValue;
            var inBakuDirect = created >= startOfBakuMonth && created < endOfBakuMonth;
            var inUtcRange = created >= startUtc && created < endUtc;
            return inBakuDirect || inUtcRange;
        });

        record.ProductsSold = UpdateMetric(record.ProductsSold, productsSold, bakuNow, out var c1);
        if (c1) changed = true;

        record.MonthlyRevenue = UpdateMetric(record.MonthlyRevenue, monthlyProfit, bakuNow, out var c2);
        if (c2) changed = true;

        record.NewRegistrations = UpdateMetric(record.NewRegistrations, registrations, bakuNow, out var c3);
        if (c3) changed = true;

        record.AverageRating = UpdateMetric(record.AverageRating, averageRating, bakuNow, out var c4);
        if (c4) changed = true;

        record.UsersRated = UpdateMetric(record.UsersRated, reviewersCount, bakuNow, out var c5);
        if (c5) changed = true;

        record.PromosCreated = UpdateMetric(record.PromosCreated, promosCreated, bakuNow, out var c6);
        if (c6) changed = true;

        record.PromoDiscounts = UpdateMetric(record.PromoDiscounts, monthlyPromoDiscounts, bakuNow, out var c7);
        if (c7) changed = true;

        _tickCount++;
        if (_tickCount % 5 == 1 || isNew)
        {
            var storageStats = await GetStorageStatsAsync(stoppingToken);
            if (storageStats.HasValue)
            {
                record.FilesInStorage = UpdateMetric(record.FilesInStorage, storageStats.Value.fileCount, bakuNow, out var c8);
                if (c8) changed = true;

                record.StorageUsed = UpdateMetric(record.StorageUsed, storageStats.Value.storageFormatted, bakuNow, out var c9);
                if (c9) changed = true;
            }
        }

        if (changed)
        {
            record.UpdatedAt = bakuNow;
            context.Entry(record).State = EntityState.Modified;
            await context.SaveChangesAsync(stoppingToken);
        }
    }

    private async Task<(int fileCount, string storageFormatted)?> GetStorageStatsAsync(CancellationToken cancellationToken)
    {
        try
        {
            var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL");
            var serviceKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY");

            if (string.IsNullOrWhiteSpace(supabaseUrl) || string.IsNullOrWhiteSpace(serviceKey))
                return null;

            var client = _httpClientFactory.CreateClient("supabase");
            client.DefaultRequestHeaders.Clear();
            client.DefaultRequestHeaders.Add("apikey", serviceKey);
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {serviceKey}");

            var body = JsonSerializer.Serialize(new
            {
                limit = 200,
                offset = 0,
                prefix = "database/",
                sortBy = new { column = "created_at", order = "desc" }
            });

            var request = new HttpRequestMessage(HttpMethod.Post, $"{supabaseUrl}/storage/v1/object/list/admin-files")
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json")
            };

            var response = await client.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
                return null;

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            using var doc = JsonDocument.Parse(json);
            var fileList = doc.RootElement.EnumerateArray()
                .Where(item =>
                {
                    var n = item.TryGetProperty("name", out var np) ? np.GetString() ?? "" : "";
                    return !string.IsNullOrWhiteSpace(n) && n != ".emptyFolderPlaceholder";
                })
                .Select(item =>
                {
                    long size = 0;
                    if (item.TryGetProperty("metadata", out var meta) &&
                        meta.ValueKind == JsonValueKind.Object &&
                        meta.TryGetProperty("size", out var sizeEl))
                    {
                        size = sizeEl.GetInt64();
                    }
                    return size;
                })
                .ToList();

            var count = fileList.Count;
            var totalKb = fileList.Sum(s => s) / 1024.0;
            var formatted = totalKb < 1024
                ? $"{Math.Round(totalKb)} KB"
                : $"{(totalKb / 1024.0).ToString("0.0", CultureInfo.InvariantCulture)} MB";

            return (count, formatted);
        }
        catch
        {
            return null;
        }
    }

    private static MetricSnapshot<T> UpdateMetric<T>(MetricSnapshot<T>? current, T newValue, DateTime now, out bool changed)
    {
        if (current != null && current.CurrentValue is not null && EqualityComparer<T>.Default.Equals(current.CurrentValue, newValue) && current.UpdatedAt != default)
        {
            changed = false;
            return current;
        }

        var next = new MetricSnapshot<T>
        {
            PreviousValue = (current == null || current.CurrentValue is null || current.UpdatedAt == default) ? newValue : current.CurrentValue,
            CurrentValue = newValue,
            UpdatedAt = now
        };

        if (current?.History != null)
        {
            foreach (var h in current.History)
            {
                next.History.Add(new MetricHistoryItem<T>
                {
                    From = h.From,
                    To = h.To,
                    UpdatedAt = h.UpdatedAt
                });
            }
        }

        if (current != null && current.CurrentValue is not null && current.UpdatedAt != default)
        {
            next.History.Add(new MetricHistoryItem<T>
            {
                From = current.CurrentValue,
                To = newValue,
                UpdatedAt = now
            });
        }

        changed = true;
        return next;
    }
}
