using System.Net.Http.Headers;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rednest.Core.Entities;
using Rednest.Infrastructure.Data;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace Rednest.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly AppDbContext _context;
    private static readonly HashSet<string> _validSessions = new();

    private static readonly string[] AllowedExtensions = [".png", ".jpg", ".jpeg"];
    private const long MaxFileSizeBytes = 10 * 1024 * 1024;

    public AdminController(IHttpClientFactory httpClientFactory, AppDbContext context)
    {
        _httpClientFactory = httpClientFactory;
        _context = context;
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] AdminLoginRequest request)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out _))
            return Unauthorized(new { message = "You must be logged in with an active account to access the admin panel." });

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
    
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        if (!IsAdminAuthenticated())
            return Unauthorized();

        var users = await _context.Users
            .Include(u => u.Session)
            .Include(u => u.Promos)
            .AsNoTracking()
            .ToListAsync();

        var orders = await _context.Orders
            .AsNoTracking()
            .Select(o => new { o.UserId, TotalAmount = o.Payment != null ? o.Payment.TotalAmount : 0m })
            .ToListAsync();

        var ordersGrouped = orders
            .GroupBy(o => o.UserId)
            .ToDictionary(g => g.Key, g => new { Count = g.Count(), TotalSpent = g.Sum(x => x.TotalAmount) });

        var result = users.Select(u =>
        {
            var hasOrders = ordersGrouped.TryGetValue(u.Id, out var oStats);
            var ordersCount = hasOrders ? oStats!.Count : 0;
            var totalSpent = hasOrders ? oStats!.TotalSpent : 0m;

            var activeSessions = u.Session?.Sessions?
                .Where(s => s.IsActive != false && s.RefreshTokenExpiryTime > DateTime.UtcNow)
                .ToList() ?? new List<SessionEntry>();

            var latestSession = u.Session?.Sessions?
                .OrderByDescending(s => s.LastActiveAt ?? s.CreatedAt)
                .FirstOrDefault();

            var createdDate = u.Session?.Sessions?
                .OrderBy(s => s.CreatedAt)
                .Select(s => (DateTime?)s.CreatedAt)
                .FirstOrDefault() ?? DateTime.UtcNow;

            return new
            {
                id = u.Id,
                email = u.Email,
                name = u.Name,
                profilePictureUrl = u.ProfilePictureUrl,
                balance = u.Balance,
                isActive = u.Session?.IsActive ?? true,
                twoFactorEnabled = u.Session?.TwoFactorEnabled ?? false,
                subscribe = u.Session?.Subscribe ?? false,
                registrationIp = u.Session?.RegistrationIp,
                addressesCount = u.Addresses?.Count ?? 0,
                paymentMethodsCount = u.PaymentMethods?.Count ?? 0,
                promosCount = u.Promos?.Count ?? 0,
                ordersCount,
                totalSpent,
                activeSessionsCount = activeSessions.Count,
                lastLoginIp = latestSession?.LastLoginIp ?? u.Session?.RegistrationIp,
                lastActiveAt = latestSession?.LastActiveAt ?? latestSession?.CreatedAt,
                createdAt = createdDate
            };
        }).OrderByDescending(u => u.createdAt).ToList();

        return Ok(result);
    }

    [HttpGet("users/{id:guid}")]
    public async Task<IActionResult> GetUserById(Guid id)
    {
        if (!IsAdminAuthenticated())
            return Unauthorized();

        var user = await _context.Users
            .Include(u => u.Session)
            .Include(u => u.Promos)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
            return NotFound(new { message = "User not found." });

        var userOrders = await _context.Orders
            .Where(o => o.UserId == id)
            .OrderByDescending(o => o.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            name = user.Name,
            profilePictureUrl = user.ProfilePictureUrl,
            balance = user.Balance,
            addresses = user.Addresses ?? new List<UserAddress>(),
            paymentMethods = (user.PaymentMethods ?? new List<UserPaymentMethod>()).Select(pm => new
            {
                pm.Id,
                pm.CardName,
                pm.CardholderName,
                pm.CardBrand,
                pm.ExpiryDate,
                pm.IsDefault,
                pm.CreatedAt,
                last4 = pm.Id > 0 ? pm.Id.ToString("D4") : "••••"
            }),
            session = user.Session != null ? new
            {
                user.Session.RegistrationIp,
                user.Session.TwoFactorEnabled,
                user.Session.Subscribe,
                user.Session.IsActive,
                sessions = user.Session.Sessions ?? new List<SessionEntry>(),
                accountVerify = user.Session.AccountVerify ?? new List<AccountVerifyEntry>()
            } : null,
            promos = user.Promos?.Select(p => new
            {
                p.Id,
                p.Codes,
                p.PrizeInfo,
                p.Dates,
                p.IsActive
            }) ?? Enumerable.Empty<object>(),
            orders = userOrders.Select(o => new
            {
                o.Id,
                o.CreatedAt,
                o.Status,
                itemsCount = o.Items?.Count ?? 0,
                totalAmount = o.Payment?.TotalAmount ?? 0m,
                paymentMethod = o.Payment != null ? o.Payment.PaymentMethod.ToString() : "Unknown",
                promoCode = o.Payment?.PromoCode,
                promoPrizeName = o.Payment?.PromoPrizeName,
                comment = o.Notes?.Comment
            })
        });
    }

    [HttpPut("users/{id:guid}")]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] AdminUpdateUserRequest request)
    {
        if (!IsAdminAuthenticated())
            return Unauthorized();

        var user = await _context.Users
            .Include(u => u.Session)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
            return NotFound(new { message = "User not found." });

        if (request.Name != null)
            user.Name = string.IsNullOrWhiteSpace(request.Name) ? null : request.Name.Trim();

        if (!string.IsNullOrWhiteSpace(request.Email) && request.Email.Trim().ToLower() != user.Email.ToLower())
        {
            var cleanEmail = request.Email.Trim().ToLower();
            var existing = await _context.Users.AnyAsync(u => u.Email == cleanEmail && u.Id != id);
            if (existing)
                return BadRequest(new { message = "This email is already registered to another account." });
            user.Email = cleanEmail;
        }

        if (request.Balance.HasValue)
            user.Balance = Math.Max(0, Math.Round(request.Balance.Value, 2));

        if (user.Session == null)
        {
            user.Session = new UserSession
            {
                UserId = user.Id,
                IsActive = request.IsActive ?? true,
                TwoFactorEnabled = request.TwoFactorEnabled ?? false,
                Subscribe = request.Subscribe ?? false
            };
        }
        else
        {
            if (request.IsActive.HasValue)
            {
                user.Session.IsActive = request.IsActive.Value;
                if (!request.IsActive.Value && user.Session.Sessions != null)
                {
                    user.Session.Sessions.Clear();
                }
            }
            if (request.TwoFactorEnabled.HasValue)
                user.Session.TwoFactorEnabled = request.TwoFactorEnabled.Value;
            if (request.Subscribe.HasValue)
                user.Session.Subscribe = request.Subscribe.Value;
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "User updated successfully.",
            user = new
            {
                user.Id,
                user.Name,
                user.Email,
                user.Balance,
                isActive = user.Session.IsActive,
                twoFactorEnabled = user.Session.TwoFactorEnabled,
                subscribe = user.Session.Subscribe
            }
        });
    }

    [HttpPost("users/{id:guid}/sessions/terminate")]
    public async Task<IActionResult> TerminateUserSessions(Guid id)
    {
        if (!IsAdminAuthenticated())
            return Unauthorized();

        var session = await _context.UserSessions.FirstOrDefaultAsync(s => s.UserId == id);
        if (session == null)
            return NotFound(new { message = "User session record not found." });

        session.Sessions.Clear();
        await _context.SaveChangesAsync();

        return Ok(new { message = "All active sessions have been terminated." });
    }

    [HttpDelete("users/{id:guid}")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        if (!IsAdminAuthenticated())
            return Unauthorized();

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            return NotFound(new { message = "User not found." });

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return Ok(new { message = "User deleted successfully." });
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
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out _))
            return false;

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

public class AdminUpdateUserRequest
{
    public string? Name { get; set; }
    public string? Email { get; set; }
    public decimal? Balance { get; set; }
    public bool? IsActive { get; set; }
    public bool? TwoFactorEnabled { get; set; }
    public bool? Subscribe { get; set; }
}

