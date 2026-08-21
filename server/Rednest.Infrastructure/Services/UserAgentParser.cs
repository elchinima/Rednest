namespace Rednest.Infrastructure.Services;

public class UserAgentInfo
{
    public string OperatingSystem { get; set; } = "Unknown OS";
    public string DeviceType { get; set; } = "Desktop";
    public string DeviceName { get; set; } = "Unknown Device";
}

public static class UserAgentParser
{
    public static UserAgentInfo Parse(string? userAgent)
    {
        var info = new UserAgentInfo();
        if (string.IsNullOrWhiteSpace(userAgent))
        {
            info.OperatingSystem = "Unknown OS";
            info.DeviceType = "Desktop";
            info.DeviceName = "PC";
            return info;
        }

        var ua = userAgent.Trim();

        if (ua.Contains("iPad", StringComparison.OrdinalIgnoreCase) ||
            ua.Contains("Tablet", StringComparison.OrdinalIgnoreCase) ||
            ua.Contains("PlayBook", StringComparison.OrdinalIgnoreCase) ||
            ua.Contains("Silk", StringComparison.OrdinalIgnoreCase))
        {
            info.DeviceType = "Tablet";
        }
        else if (ua.Contains("Mobile", StringComparison.OrdinalIgnoreCase) ||
                 ua.Contains("iPhone", StringComparison.OrdinalIgnoreCase) ||
                 ua.Contains("Android", StringComparison.OrdinalIgnoreCase) ||
                 ua.Contains("webOS", StringComparison.OrdinalIgnoreCase) ||
                 ua.Contains("iPod", StringComparison.OrdinalIgnoreCase) ||
                 ua.Contains("BlackBerry", StringComparison.OrdinalIgnoreCase) ||
                 ua.Contains("IEMobile", StringComparison.OrdinalIgnoreCase))
        {
            info.DeviceType = "Mobile";
        }
        else
        {
            info.DeviceType = "Desktop";
        }

        if (ua.Contains("Windows NT 10.0", StringComparison.OrdinalIgnoreCase))
            info.OperatingSystem = "Windows 10 / 11";
        else if (ua.Contains("Windows NT 6.3", StringComparison.OrdinalIgnoreCase))
            info.OperatingSystem = "Windows 8.1";
        else if (ua.Contains("Windows NT 6.2", StringComparison.OrdinalIgnoreCase))
            info.OperatingSystem = "Windows 8";
        else if (ua.Contains("Windows NT 6.1", StringComparison.OrdinalIgnoreCase))
            info.OperatingSystem = "Windows 7";
        else if (ua.Contains("Windows", StringComparison.OrdinalIgnoreCase))
            info.OperatingSystem = "Windows";
        else if (ua.Contains("iPhone", StringComparison.OrdinalIgnoreCase) || ua.Contains("iPad", StringComparison.OrdinalIgnoreCase) || ua.Contains("iOS", StringComparison.OrdinalIgnoreCase))
            info.OperatingSystem = "iOS";
        else if (ua.Contains("Android", StringComparison.OrdinalIgnoreCase))
            info.OperatingSystem = "Android";
        else if (ua.Contains("Mac OS X", StringComparison.OrdinalIgnoreCase) || ua.Contains("Macintosh", StringComparison.OrdinalIgnoreCase))
            info.OperatingSystem = "macOS";
        else if (ua.Contains("CrOS", StringComparison.OrdinalIgnoreCase))
            info.OperatingSystem = "ChromeOS";
        else if (ua.Contains("Linux", StringComparison.OrdinalIgnoreCase))
            info.OperatingSystem = "Linux";
        else
            info.OperatingSystem = "Unknown OS";

        string browser = "Browser";
        if (ua.Contains("Edg/", StringComparison.OrdinalIgnoreCase) || ua.Contains("Edge/", StringComparison.OrdinalIgnoreCase))
            browser = "Edge";
        else if (ua.Contains("OPR/", StringComparison.OrdinalIgnoreCase) || ua.Contains("Opera", StringComparison.OrdinalIgnoreCase))
            browser = "Opera";
        else if (ua.Contains("YaBrowser", StringComparison.OrdinalIgnoreCase))
            browser = "Yandex Browser";
        else if (ua.Contains("Chrome", StringComparison.OrdinalIgnoreCase) && !ua.Contains("Chromium", StringComparison.OrdinalIgnoreCase))
            browser = "Chrome";
        else if (ua.Contains("Safari", StringComparison.OrdinalIgnoreCase) && !ua.Contains("Chrome", StringComparison.OrdinalIgnoreCase))
            browser = "Safari";
        else if (ua.Contains("Firefox", StringComparison.OrdinalIgnoreCase))
            browser = "Firefox";

        string device = info.DeviceType switch
        {
            "Mobile" when ua.Contains("iPhone", StringComparison.OrdinalIgnoreCase) => "Apple iPhone",
            "Tablet" when ua.Contains("iPad", StringComparison.OrdinalIgnoreCase) => "Apple iPad",
            "Mobile" when ua.Contains("Samsung", StringComparison.OrdinalIgnoreCase) => "Samsung Mobile",
            "Mobile" => "Mobile Device",
            "Tablet" => "Tablet Device",
            _ when info.OperatingSystem.StartsWith("Windows") => "Windows PC",
            _ when info.OperatingSystem == "macOS" => "Apple Mac",
            _ when info.OperatingSystem == "Linux" => "Linux PC",
            _ => "PC"
        };

        info.DeviceName = $"{device} ({browser})";

        return info;
    }
}
