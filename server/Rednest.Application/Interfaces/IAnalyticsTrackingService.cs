namespace Rednest.Application.Interfaces;

public interface IAnalyticsTrackingService
{
    Task TrackAnalyticsAsync(CancellationToken stoppingToken = default);
}
