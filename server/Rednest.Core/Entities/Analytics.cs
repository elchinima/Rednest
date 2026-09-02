namespace Rednest.Core.Entities;

public class MetricHistoryItem<T>
{
    public T? From { get; set; }
    public T? To { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class MetricSnapshot<T>
{
    public T? PreviousValue { get; set; }
    public T? CurrentValue { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<MetricHistoryItem<T>> History { get; set; } = new();
}

public class DailyPeakRecord
{
    public string Date { get; set; } = string.Empty;
    public int PeakOnline { get; set; }
    public DateTime RecordedAt { get; set; }
}

public class DailyPeakOnlineData
{
    public int MonthlyPeak { get; set; }
    public int TodayPeak { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<DailyPeakRecord> Days { get; set; } = new();
}

public class Analytics
{
    public string MonthYear { get; set; } = string.Empty;

    public MetricSnapshot<int> ProductsSold { get; set; } = new();
    public MetricSnapshot<decimal> MonthlyRevenue { get; set; } = new();
    public MetricSnapshot<int> NewRegistrations { get; set; } = new();
    public DailyPeakOnlineData DailyPeakOnline { get; set; } = new();
    public MetricSnapshot<decimal> AverageRating { get; set; } = new();
    public MetricSnapshot<int> UsersRated { get; set; } = new();
    public MetricSnapshot<int> PromosCreated { get; set; } = new();
    public MetricSnapshot<decimal> PromoDiscounts { get; set; } = new();
    public MetricSnapshot<int> FilesInStorage { get; set; } = new();
    public MetricSnapshot<string> StorageUsed { get; set; } = new();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow.AddHours(4);
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow.AddHours(4);
}
