using System.Collections.Concurrent;
using System.Net.Http;
using System.Text.Json;

namespace Rednest.Infrastructure.Services;

public interface IGeoLocationService
{
    Task<string> GetCountryAsync(string? ipAddress);
}

public class GeoLocationService : IGeoLocationService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private static readonly ConcurrentDictionary<string, string> _cache = new();

    public GeoLocationService(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public async Task<string> GetCountryAsync(string? ipAddress)
    {
        if (string.IsNullOrWhiteSpace(ipAddress))
            return "Unknown";

        var cleanIp = ipAddress.Split(',')[0].Trim();

        if (cleanIp == "127.0.0.1" || cleanIp == "::1" || cleanIp.StartsWith("192.168.") || cleanIp.StartsWith("10."))
            return "Local Network";

        if (_cache.TryGetValue(cleanIp, out var cachedCountry))
            return cachedCountry;

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(3);
            var response = await client.GetAsync($"http://ip-api.com/json/{cleanIp}?fields=status,country");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(content);
                if (doc.RootElement.TryGetProperty("status", out var status) && status.GetString() == "success" &&
                    doc.RootElement.TryGetProperty("country", out var countryProp))
                {
                    var country = countryProp.GetString();
                    if (!string.IsNullOrWhiteSpace(country))
                    {
                        _cache[cleanIp] = country;
                        return country;
                    }
                }
            }
        }
        catch { }

        return "Unknown";
    }
}
