namespace Rednest.Infrastructure.Services;

public class UserAgentInfo
{
    public string OperatingSystem { get; set; } = "Unknown OS";
    public string DeviceType { get; set; } = "Desktop";
    public string DeviceName { get; set; } = "Unknown Device";
}

public static class UserAgentParser
{
    public static UserAgentInfo Parse(string? userAgent, string? platformVersion = null, string? deviceModel = null)
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

        if (ua.Contains("Windows NT 10.0", StringComparison.OrdinalIgnoreCase) ||
            ua.Contains("Windows 10", StringComparison.OrdinalIgnoreCase) ||
            ua.Contains("Windows 11", StringComparison.OrdinalIgnoreCase))
        {
            if (!string.IsNullOrWhiteSpace(platformVersion))
            {
                var cleanVer = platformVersion.Trim('\"', ' ', '\'');
                var majorStr = cleanVer.Split('.')[0];
                if (int.TryParse(majorStr, out var majorVer))
                {
                    info.OperatingSystem = majorVer >= 13 ? "Windows 11" : "Windows 10";
                }
                else
                {
                    info.OperatingSystem = "Windows 10";
                }
            }
            else if (ua.Contains("Windows 11", StringComparison.OrdinalIgnoreCase))
            {
                info.OperatingSystem = "Windows 11";
            }
            else
            {
                info.OperatingSystem = "Windows 10";
            }
        }
        else if (ua.Contains("Windows NT 6.3", StringComparison.OrdinalIgnoreCase))
        {
            info.OperatingSystem = "Windows 8.1";
        }
        else if (ua.Contains("Windows NT 6.2", StringComparison.OrdinalIgnoreCase))
        {
            info.OperatingSystem = "Windows 8";
        }
        else if (ua.Contains("Windows NT 6.1", StringComparison.OrdinalIgnoreCase))
        {
            info.OperatingSystem = "Windows 7";
        }
        else if (ua.Contains("Windows", StringComparison.OrdinalIgnoreCase))
        {
            info.OperatingSystem = "Windows";
        }
        else if (ua.Contains("iPhone", StringComparison.OrdinalIgnoreCase) || ua.Contains("iPad", StringComparison.OrdinalIgnoreCase) || ua.Contains("iOS", StringComparison.OrdinalIgnoreCase))
        {
            var iosMatch = Regex.Match(ua, @"(?:iPhone OS |CPU OS |iOS )(\d+[_.]\d+(?:[_.]\d+)?)", RegexOptions.IgnoreCase);
            var isTablet = ua.Contains("iPad", StringComparison.OrdinalIgnoreCase);
            var osPrefix = isTablet ? "iPadOS" : "iOS";
            if (iosMatch.Success)
            {
                var ver = iosMatch.Groups[1].Value.Replace('_', '.');
                info.OperatingSystem = $"{osPrefix} {ver}";
            }
            else
            {
                info.OperatingSystem = osPrefix;
            }
        }
        else if (ua.Contains("Android", StringComparison.OrdinalIgnoreCase))
        {
            if (!string.IsNullOrWhiteSpace(platformVersion))
            {
                var cleanVer = platformVersion.Trim('\"', ' ', '\'');
                var parts = cleanVer.Split('.');
                if (parts.Length >= 2 && int.TryParse(parts[0], out var major) && int.TryParse(parts[1], out var minor))
                {
                    info.OperatingSystem = minor > 0 ? $"Android {major}.{minor}" : $"Android {major}";
                }
                else if (int.TryParse(parts[0], out var majorOnly) && majorOnly > 0)
                {
                    info.OperatingSystem = $"Android {majorOnly}";
                }
                else if (!string.IsNullOrWhiteSpace(cleanVer))
                {
                    info.OperatingSystem = $"Android {cleanVer}";
                }
                else
                {
                    info.OperatingSystem = "Android";
                }
            }
            else
            {
                var androidMatch = Regex.Match(ua, @"Android\s+([\d.]+)", RegexOptions.IgnoreCase);
                if (androidMatch.Success)
                {
                    info.OperatingSystem = $"Android {androidMatch.Groups[1].Value}";
                }
                else
                {
                    info.OperatingSystem = "Android";
                }
            }
        }
        else if (ua.Contains("Mac OS X", StringComparison.OrdinalIgnoreCase) || ua.Contains("Macintosh", StringComparison.OrdinalIgnoreCase))
        {
            var macMatch = Regex.Match(ua, @"Mac OS X (\d+[_.]\d+(?:[_.]\d+)?)", RegexOptions.IgnoreCase);
            if (macMatch.Success)
            {
                var ver = macMatch.Groups[1].Value.Replace('_', '.');
                info.OperatingSystem = $"macOS {ver}";
            }
            else
            {
                info.OperatingSystem = "macOS";
            }
        }
        else if (ua.Contains("CrOS", StringComparison.OrdinalIgnoreCase))
        {
            info.OperatingSystem = "ChromeOS";
        }
        else if (ua.Contains("Linux", StringComparison.OrdinalIgnoreCase))
        {
            info.OperatingSystem = "Linux";
        }
        else
        {
            info.OperatingSystem = "Unknown OS";
        }

        string browser = "Browser";
        if (ua.Contains("Edg/", StringComparison.OrdinalIgnoreCase) || ua.Contains("Edge/", StringComparison.OrdinalIgnoreCase))
            browser = "Edge";
        else if (ua.Contains("OPR/", StringComparison.OrdinalIgnoreCase) || ua.Contains("Opera", StringComparison.OrdinalIgnoreCase))
            browser = "Opera";
        else if (ua.Contains("YaBrowser", StringComparison.OrdinalIgnoreCase))
            browser = "Yandex Browser";
        else if (ua.Contains("SamsungBrowser", StringComparison.OrdinalIgnoreCase))
            browser = "Samsung Internet";
        else if (ua.Contains("Chrome", StringComparison.OrdinalIgnoreCase) && !ua.Contains("Chromium", StringComparison.OrdinalIgnoreCase))
            browser = "Chrome";
        else if (ua.Contains("Safari", StringComparison.OrdinalIgnoreCase) && !ua.Contains("Chrome", StringComparison.OrdinalIgnoreCase))
            browser = "Safari";
        else if (ua.Contains("Firefox", StringComparison.OrdinalIgnoreCase))
            browser = "Firefox";

        string device;
        if (ua.Contains("iPhone", StringComparison.OrdinalIgnoreCase))
        {
            device = "Apple iPhone";
        }
        else if (ua.Contains("iPad", StringComparison.OrdinalIgnoreCase))
        {
            device = "Apple iPad";
        }
        else if (ua.Contains("Android", StringComparison.OrdinalIgnoreCase))
        {
            string? rawModel = null;
            if (!string.IsNullOrWhiteSpace(deviceModel))
            {
                var cleanModel = deviceModel.Trim('\"', ' ', '\'');
                if (cleanModel.Length > 0 && 
                    !cleanModel.Equals("K", StringComparison.OrdinalIgnoreCase) && 
                    !cleanModel.Equals("Mobile", StringComparison.OrdinalIgnoreCase))
                {
                    rawModel = cleanModel;
                }
            }

            if (rawModel == null)
            {
                var modelMatch = Regex.Match(ua, @";\s*Android[^;]*;\s*([^;)]+?)(?:\s+Build|[;)])", RegexOptions.IgnoreCase);
                if (modelMatch.Success && !string.IsNullOrWhiteSpace(modelMatch.Groups[1].Value))
                {
                    var m = modelMatch.Groups[1].Value.Trim();
                    if (m.Length > 2 && !m.Equals("K", StringComparison.OrdinalIgnoreCase) && !m.Equals("Mobile", StringComparison.OrdinalIgnoreCase))
                    {
                        rawModel = m;
                    }
                }
            }

            if (!string.IsNullOrWhiteSpace(rawModel))
            {
                if (rawModel.StartsWith("SM-", StringComparison.OrdinalIgnoreCase) || rawModel.StartsWith("GT-", StringComparison.OrdinalIgnoreCase))
                    device = rawModel.StartsWith("Samsung", StringComparison.OrdinalIgnoreCase) ? rawModel : $"Samsung {rawModel}";
                else if (rawModel.StartsWith("Samsung", StringComparison.OrdinalIgnoreCase))
                    device = rawModel;
                else if (rawModel.StartsWith("Pixel", StringComparison.OrdinalIgnoreCase))
                    device = $"Google {rawModel}";
                else if (rawModel.StartsWith("Mi ", StringComparison.OrdinalIgnoreCase) || rawModel.StartsWith("Redmi", StringComparison.OrdinalIgnoreCase) || rawModel.StartsWith("POCO", StringComparison.OrdinalIgnoreCase))
                    device = $"Xiaomi {rawModel}";
                else if (rawModel.StartsWith("moto", StringComparison.OrdinalIgnoreCase))
                    device = $"Motorola {rawModel}";
                else if (rawModel.StartsWith("CPH", StringComparison.OrdinalIgnoreCase))
                    device = $"OPPO {rawModel}";
                else if (rawModel.StartsWith("RMX", StringComparison.OrdinalIgnoreCase))
                    device = $"Realme {rawModel}";
                else
                    device = rawModel;
            }
            else
            {
                device = "Android Device";
            }
        }
        else if (info.OperatingSystem.StartsWith("Windows"))
        {
            device = "Windows PC";
        }
        else if (info.OperatingSystem.StartsWith("macOS"))
        {
            device = "Apple Mac";
        }
        else if (info.OperatingSystem.StartsWith("Linux"))
        {
            device = "Linux PC";
        }
        else
        {
            device = info.DeviceType == "Mobile" ? "Mobile Device" : "PC";
        }

        info.DeviceName = $"{device} ({browser})";

        return info;
    }
}
