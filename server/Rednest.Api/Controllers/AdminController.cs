namespace Rednest.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly AppDbContext _context;

    private static readonly string[] AllowedExtensions = [".png", ".jpg", ".jpeg"];
    private const long MaxFileSizeBytes = 10 * 1024 * 1024;
    private const int AdminSessionHours = 8;

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

        var token = GenerateSignedAdminToken(userIdStr);

        Response.Cookies.Append("admin_session", token, AdminSessionCookieOptions());

        return Ok(new { message = "OK" });
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("admin_session", AdminSessionCookieOptions());
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
                role = u.Role == UserRole.SuperAdmin ? "Super Admin" : u.Role.ToString(),
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
            role = user.Role == UserRole.SuperAdmin ? "Super Admin" : user.Role.ToString(),
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

        var currentUserIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        User? currentUser = null;
        Guid currentUserId = Guid.Empty;
        if (Guid.TryParse(currentUserIdStr, out currentUserId))
        {
            currentUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == currentUserId);
        }

        if (currentUserId != Guid.Empty && currentUserId == id)
        {
            if (request.IsActive.HasValue && !request.IsActive.Value)
            {
                return BadRequest(new { message = "You cannot deactivate or block your own account." });
            }
        }

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

        if (!string.IsNullOrWhiteSpace(request.Role))
        {
            var cleanRole = request.Role.Trim().Replace(" ", "");
            if (Enum.TryParse<UserRole>(cleanRole, true, out var parsedRole))
            {
                if (parsedRole != user.Role)
                {
                    var currentUserRole = currentUser?.Role ?? UserRole.Customer;

                    if (currentUserId == id)
                    {
                        return BadRequest(new { message = "You cannot change your own role." });
                    }

                    if ((int)user.Role >= (int)currentUserRole)
                    {
                        return BadRequest(new { message = "You cannot modify the role of a user with an equal or higher role than yours." });
                    }

                    if ((int)parsedRole >= (int)currentUserRole)
                    {
                        return BadRequest(new { message = "You cannot assign your own role or a higher role to any user." });
                    }

                    user.Role = parsedRole;
                }
            }
            else
            {
                return BadRequest(new { message = $"Invalid role specified: '{request.Role}'." });
            }
        }

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
                role = user.Role == UserRole.SuperAdmin ? "Super Admin" : user.Role.ToString(),
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

        var currentUserIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(currentUserIdStr, out var currentUserId) && currentUserId == id)
        {
            return BadRequest(new { message = "You cannot terminate your own active sessions from the admin panel." });
        }

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

        var currentUserIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(currentUserIdStr, out var currentUserId) && currentUserId == id)
        {
            return BadRequest(new { message = "You cannot delete your own account." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            return NotFound(new { message = "User not found." });

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return Ok(new { message = "User deleted successfully." });
    }

    [HttpGet("orders")]
    public async Task<IActionResult> GetOrders()
    {
        if (!IsAdminAuthenticated())
            return Unauthorized();

        var orders = await _context.Orders
            .AsNoTracking()
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        var userIds = orders.Select(o => o.UserId).Distinct().ToList();
        var users = await _context.Users
            .Where(u => userIds.Contains(u.Id))
            .AsNoTracking()
            .ToDictionaryAsync(u => u.Id);

        var productIds = orders
            .SelectMany(o => o.Items ?? Enumerable.Empty<OrderProductItem>())
            .Select(i => i.ProductId)
            .Distinct()
            .ToList();

        var products = await _context.Products
            .Where(p => productIds.Contains(p.Id))
            .AsNoTracking()
            .ToDictionaryAsync(p => p.Id);

        var result = orders.Select(o =>
        {
            users.TryGetValue(o.UserId, out var u);
            var itemsEnriched = (o.Items ?? new List<OrderProductItem>()).Select(i => new
            {
                productId = i.ProductId,
                quantity = i.Quantity,
                unitPrice = i.UnitPrice,
                name = products.TryGetValue(i.ProductId, out var prod) ? prod.Name : "Product",
                imageUrl = products.TryGetValue(i.ProductId, out var prod2) ? prod2.ImageUrl : null,
                category = products.TryGetValue(i.ProductId, out var prod3) ? prod3.Category : ""
            }).ToList();

            return new
            {
                id = o.Id,
                userId = o.UserId,
                user = u != null ? new
                {
                    id = u.Id,
                    name = u.Name,
                    email = u.Email,
                    profilePictureUrl = u.ProfilePictureUrl,
                    balance = u.Balance
                } : null,
                status = o.Status,
                createdAt = o.CreatedAt,
                itemsCount = o.Items?.Count ?? 0,
                totalUnits = o.Items?.Sum(i => i.Quantity) ?? 0,
                items = itemsEnriched,
                payment = o.Payment != null ? new
                {
                    paymentMethod = o.Payment.PaymentMethod.ToString(),
                    originalTotal = o.Payment.OriginalTotal,
                    discountAmount = o.Payment.DiscountAmount,
                    totalAmount = o.Payment.TotalAmount,
                    promoCode = o.Payment.PromoCode,
                    promoPrizeName = o.Payment.PromoPrizeName,
                    paymentIntentId = o.Payment.PaymentIntentId
                } : null,
                notes = o.Notes
            };
        }).ToList();

        return Ok(result);
    }

    [HttpGet("orders/{id:guid}")]
    public async Task<IActionResult> GetOrderById(Guid id)
    {
        if (!IsAdminAuthenticated())
            return Unauthorized();

        var order = await _context.Orders
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null)
            return NotFound(new { message = "Order not found." });

        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == order.UserId);

        var productIds = (order.Items ?? new List<OrderProductItem>())
            .Select(i => i.ProductId)
            .Distinct()
            .ToList();

        var products = await _context.Products
            .Where(p => productIds.Contains(p.Id))
            .AsNoTracking()
            .ToDictionaryAsync(p => p.Id);

        var itemsEnriched = (order.Items ?? new List<OrderProductItem>()).Select(i => new
        {
            productId = i.ProductId,
            quantity = i.Quantity,
            unitPrice = i.UnitPrice,
            name = products.TryGetValue(i.ProductId, out var prod) ? prod.Name : "Product",
            imageUrl = products.TryGetValue(i.ProductId, out var prod2) ? prod2.ImageUrl : null,
            category = products.TryGetValue(i.ProductId, out var prod3) ? prod3.Category : ""
        }).ToList();

        return Ok(new
        {
            id = order.Id,
            userId = order.UserId,
            user = user != null ? new
            {
                id = user.Id,
                name = user.Name,
                email = user.Email,
                profilePictureUrl = user.ProfilePictureUrl,
                balance = user.Balance
            } : null,
            status = order.Status,
            createdAt = order.CreatedAt,
            itemsCount = order.Items?.Count ?? 0,
            totalUnits = order.Items?.Sum(i => i.Quantity) ?? 0,
            items = itemsEnriched,
            payment = order.Payment != null ? new
            {
                paymentMethod = order.Payment.PaymentMethod.ToString(),
                originalTotal = order.Payment.OriginalTotal,
                discountAmount = order.Payment.DiscountAmount,
                totalAmount = order.Payment.TotalAmount,
                promoCode = order.Payment.PromoCode,
                promoPrizeName = order.Payment.PromoPrizeName,
                paymentIntentId = order.Payment.PaymentIntentId
            } : null,
            notes = order.Notes
        });
    }

    [HttpPut("orders/{id:guid}/status")]
    public async Task<IActionResult> UpdateOrderStatus(Guid id, [FromBody] AdminUpdateOrderStatusRequest request)
    {
        if (!IsAdminAuthenticated())
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Status))
            return BadRequest(new { message = "Status cannot be empty." });

        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == id);
        if (order == null)
            return NotFound(new { message = "Order not found." });

        order.Status = request.Status.Trim();
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Order status updated successfully.",
            id = order.Id,
            status = order.Status
        });
    }

    [HttpDelete("orders/{id:guid}")]
    public async Task<IActionResult> DeleteOrder(Guid id)
    {
        if (!IsAdminAuthenticated())
            return Unauthorized();

        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == id);
        if (order == null)
            return NotFound(new { message = "Order not found." });

        _context.Orders.Remove(order);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Order deleted successfully." });
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

    [HttpGet("reviews")]
    public async Task<IActionResult> GetReviews()
    {
        if (!IsAdminAuthenticated())
            return Unauthorized();

        var reviews = await _context.Reviews
            .AsNoTracking()
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var userIds = reviews.Select(r => r.UserId).Distinct().ToList();
        var users = await _context.Users
            .Where(u => userIds.Contains(u.Id))
            .AsNoTracking()
            .ToDictionaryAsync(u => u.Id);

        var orderIds = reviews.Select(r => r.OrderId).Distinct().ToList();
        var orders = await _context.Orders
            .Where(o => orderIds.Contains(o.Id))
            .AsNoTracking()
            .ToDictionaryAsync(o => o.Id);

        var result = reviews.Select(r =>
        {
            users.TryGetValue(r.UserId, out var u);
            orders.TryGetValue(r.OrderId, out var o);

            return new
            {
                id = r.Id,
                userId = r.UserId,
                user = u != null ? new
                {
                    id = u.Id,
                    name = u.Name,
                    email = u.Email,
                    profilePictureUrl = u.ProfilePictureUrl
                } : null,
                orderId = r.OrderId,
                order = o != null ? new
                {
                    id = o.Id,
                    createdAt = o.CreatedAt,
                    status = o.Status,
                    totalAmount = o.Payment?.TotalAmount ?? 0m,
                    itemsCount = o.Items?.Count ?? 0
                } : null,
                category = r.Category.ToString(),
                status = r.Status.Status.ToString(),
                statusUpdatedAt = r.Status.UpdatedAt,
                language = r.Language?.ToString(),
                rating = r.ReviewData.Rating,
                comment = r.ReviewData.Comment,
                likesCount = r.Likes?.Count ?? 0,
                likes = r.Likes ?? new List<Guid>(),
                createdAt = r.CreatedAt
            };
        }).ToList();

        return Ok(result);
    }

    [HttpGet("reviews/{id:guid}")]
    public async Task<IActionResult> GetReviewById(Guid id)
    {
        if (!IsAdminAuthenticated())
            return Unauthorized();

        var review = await _context.Reviews
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id);

        if (review == null)
            return NotFound(new { message = "Review not found." });

        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == review.UserId);

        var order = await _context.Orders
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == review.OrderId);

        return Ok(new
        {
            id = review.Id,
            userId = review.UserId,
            user = user != null ? new
            {
                id = user.Id,
                name = user.Name,
                email = user.Email,
                profilePictureUrl = user.ProfilePictureUrl
            } : null,
            orderId = review.OrderId,
            order = order != null ? new
            {
                id = order.Id,
                createdAt = order.CreatedAt,
                status = order.Status,
                totalAmount = order.Payment?.TotalAmount ?? 0m,
                itemsCount = order.Items?.Count ?? 0
            } : null,
            category = review.Category.ToString(),
            status = review.Status.Status.ToString(),
            statusUpdatedAt = review.Status.UpdatedAt,
            language = review.Language?.ToString(),
            rating = review.ReviewData.Rating,
            comment = review.ReviewData.Comment,
            likesCount = review.Likes?.Count ?? 0,
            likes = review.Likes ?? new List<Guid>(),
            createdAt = review.CreatedAt
        });
    }

    [HttpPut("reviews/{id:guid}/status")]
    public async Task<IActionResult> UpdateReviewStatus(Guid id, [FromBody] AdminUpdateReviewStatusRequest request)
    {
        if (!IsAdminAuthenticated())
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Status))
            return BadRequest(new { message = "Status cannot be empty." });

        if (!Enum.TryParse<ReviewStatus>(request.Status, true, out var statusEnum))
            return BadRequest(new { message = $"Invalid review status: '{request.Status}'." });

        var review = await _context.Reviews.FirstOrDefaultAsync(r => r.Id == id);
        if (review == null)
            return NotFound(new { message = "Review not found." });

        review.Status.Status = statusEnum;
        review.Status.UpdatedAt = DateTime.UtcNow.AddHours(4);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Review status updated successfully.",
            id = review.Id,
            status = review.Status.Status.ToString(),
            statusUpdatedAt = review.Status.UpdatedAt
        });
    }

    [HttpDelete("reviews/{id:guid}")]
    public async Task<IActionResult> DeleteReview(Guid id)
    {
        if (!IsAdminAuthenticated())
            return Unauthorized();

        var review = await _context.Reviews.FirstOrDefaultAsync(r => r.Id == id);
        if (review == null)
            return NotFound(new { message = "Review not found." });

        _context.Reviews.Remove(review);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Review deleted successfully." });
    }

    private bool IsAdminAuthenticated()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out _))
            return false;

        if (!Request.Cookies.TryGetValue("admin_session", out var token) || string.IsNullOrEmpty(token))
            return false;

        return ValidateSignedAdminToken(token, userIdStr);
    }

    private static string GetAdminSigningKey()
    {
        var key = Environment.GetEnvironmentVariable("ADMIN_SECRET") ?? "";
        var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? "";
        return $"admin_session_{key}_{jwtSecret}";
    }

    private static string GenerateSignedAdminToken(string userId)
    {
        var expiresAt = DateTimeOffset.UtcNow.AddHours(AdminSessionHours).ToUnixTimeSeconds();
        var payload = $"{userId}|{expiresAt}";
        var key = Encoding.UTF8.GetBytes(GetAdminSigningKey());
        var payloadBytes = Encoding.UTF8.GetBytes(payload);
        var hash = HMACSHA256.HashData(key, payloadBytes);
        var signature = Convert.ToBase64String(hash);
        return Convert.ToBase64String(Encoding.UTF8.GetBytes($"{payload}|{signature}"));
    }

    private static bool ValidateSignedAdminToken(string token, string expectedUserId)
    {
        try
        {
            var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(token));
            var parts = decoded.Split('|');
            if (parts.Length != 3) return false;

            var userId = parts[0];
            if (!long.TryParse(parts[1], out var expiresAt)) return false;
            var signature = parts[2];

            if (userId != expectedUserId) return false;
            if (DateTimeOffset.UtcNow.ToUnixTimeSeconds() > expiresAt) return false;

            var payload = $"{userId}|{expiresAt}";
            var key = Encoding.UTF8.GetBytes(GetAdminSigningKey());
            var payloadBytes = Encoding.UTF8.GetBytes(payload);
            var expectedHash = HMACSHA256.HashData(key, payloadBytes);
            var expectedSignature = Convert.ToBase64String(expectedHash);

            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(signature),
                Encoding.UTF8.GetBytes(expectedSignature));
        }
        catch
        {
            return false;
        }
    }

    private static CookieOptions AdminSessionCookieOptions() => new()
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.None,
        Path = "/",
        Expires = DateTimeOffset.UtcNow.AddHours(AdminSessionHours)
    };
}

public record AdminLoginRequest(string Password);

public record AdminUpdateOrderStatusRequest(string Status);

public record AdminUpdateReviewStatusRequest(string Status);

public class AdminUpdateUserRequest
{
    public string? Name { get; set; }
    public string? Email { get; set; }
    public decimal? Balance { get; set; }
    public string? Role { get; set; }
    public bool? IsActive { get; set; }
    public bool? TwoFactorEnabled { get; set; }
    public bool? Subscribe { get; set; }
}

