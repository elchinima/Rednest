using Microsoft.AspNetCore.Mvc;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Security.Cryptography;

namespace Rednest.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private static readonly HashSet<string> _validSessions = new();

    private static readonly string[] AllowedExtensions = [".png", ".jpg", ".jpeg"];
    private const long MaxFileSizeBytes = 10 * 1024 * 1024;

    public AdminController(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] AdminLoginRequest request)
    {
        var adminSecret = Environment.GetEnvironmentVariable("ADMIN_SECRET");
        if (string.IsNullOrEmpty(adminSecret) || request.Password != adminSecret)
            return Unauthorized(new { message = "Incorrect password." });

        var token = GenerateSessionToken();
        _validSessions.Add(token);

        Response.Cookies.Append("admin_session", token, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddHours(8)
        });

        return Ok(new { message = "OK" });
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        if (Request.Cookies.TryGetValue("admin_session", out var token))
            _validSessions.Remove(token ?? "");

        Response.Cookies.Delete("admin_session");
        return Ok();
    }

    [HttpGet("verify")]
    public IActionResult Verify()
    {
        if (!IsAdminAuthenticated())
            return Unauthorized();

        return Ok(new { authenticated = true });
    }

    [HttpPost("upload")]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (!IsAdminAuthenticated())
            return Unauthorized();

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "File not selected." });

        if (file.Length > MaxFileSizeBytes)
            return BadRequest(new { message = "File exceeds 10 MB limit." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            return BadRequest(new { message = "Allowed formats: PNG, JPG, JPEG." });

        await using var inputStream = file.OpenReadStream();
        using var image = await Image.LoadAsync(inputStream);

        image.Mutate(x => x.Resize(image.Width / 2, image.Height / 2));

        await using var outputStream = new MemoryStream();
        var encoder = new WebpEncoder { Quality = 50 };
        await image.SaveAsync(outputStream, encoder);
        outputStream.Position = 0;

        var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL");
        var serviceKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY");

        var fileNameWithoutExt = Path.GetFileNameWithoutExtension(file.FileName);
        var uniqueName = $"{fileNameWithoutExt}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}.webp";
        var storagePath = $"database/{uniqueName}";

        var client = _httpClientFactory.CreateClient("supabase");
        client.DefaultRequestHeaders.Clear();
        client.DefaultRequestHeaders.Add("apikey", serviceKey);
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {serviceKey}");

        var content = new StreamContent(outputStream);
        content.Headers.ContentType = new MediaTypeHeaderValue("image/webp");

        var response = await client.PostAsync(
            $"{supabaseUrl}/storage/v1/object/admin-files/{storagePath}",
            content);

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            return StatusCode(500, new { message = $"Supabase upload error: {err}" });
        }

        var publicUrl = $"{supabaseUrl}/storage/v1/object/public/admin-files/{storagePath}";
        var sizeKb = Math.Round(outputStream.Length / 1024.0, 1);

        return Ok(new
        {
            fileName = uniqueName,
            publicUrl,
            sizeKb,
            width = image.Width,
            height = image.Height
        });
    }

    [HttpGet("files")]
    public async Task<IActionResult> GetFiles()
    {
        if (!IsAdminAuthenticated())
            return Unauthorized();

        var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL");
        var serviceKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY");

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

        var request = new HttpRequestMessage(HttpMethod.Post,
            $"{supabaseUrl}/storage/v1/object/list/admin-files")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };

        var response = await client.SendAsync(request);
        var json = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            return StatusCode(500, new { message = $"Error fetching files: {json}" });

        using var doc = JsonDocument.Parse(json);
        var files = doc.RootElement.EnumerateArray()
            .Where(item =>
            {
                var n = item.TryGetProperty("name", out var np) ? np.GetString() ?? "" : "";
                return !string.IsNullOrWhiteSpace(n) && n != ".emptyFolderPlaceholder";
            })
            .Select(item =>
            {
                var name = item.GetProperty("name").GetString() ?? "";
                var metadata = item.TryGetProperty("metadata", out var meta) ? meta : default;
                long size = 0;
                if (metadata.ValueKind == JsonValueKind.Object &&
                    metadata.TryGetProperty("size", out var sizeEl))
                    size = sizeEl.GetInt64();

                var storagePath = $"database/{name}";
                return new
                {
                    fileName = name,
                    publicUrl = $"{supabaseUrl}/storage/v1/object/public/admin-files/{storagePath}",
                    sizeKb = Math.Round(size / 1024.0, 1)
                };
            }).ToList();

        return Ok(files);
    }

    [HttpDelete("files/{fileName}")]
    public async Task<IActionResult> DeleteFile(string fileName)
    {
        if (!IsAdminAuthenticated())
            return Unauthorized();

        var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL");
        var serviceKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY");

        var client = _httpClientFactory.CreateClient("supabase");
        client.DefaultRequestHeaders.Clear();
        client.DefaultRequestHeaders.Add("apikey", serviceKey);
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {serviceKey}");

        var storagePath = fileName.StartsWith("database/") ? fileName : $"database/{fileName}";
        var body = JsonSerializer.Serialize(new { prefixes = new[] { storagePath } });
        var request = new HttpRequestMessage(HttpMethod.Delete,
            $"{supabaseUrl}/storage/v1/object/admin-files")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };

        var response = await client.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            return StatusCode(500, new { message = $"Delete error: {err}" });
        }

        return Ok(new { message = "File deleted." });
    }

    private bool IsAdminAuthenticated()
    {
        return Request.Cookies.TryGetValue("admin_session", out var token)
               && !string.IsNullOrEmpty(token)
               && _validSessions.Contains(token);
    }

    private static string GenerateSessionToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes);
    }
}

public record AdminLoginRequest(string Password);
