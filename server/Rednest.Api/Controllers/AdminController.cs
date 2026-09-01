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
    public async Task<IActionResult> Login([FromBody] AdminLoginRequest request)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(new { message = "You must be logged in with an active account to access the admin panel." });

        var user = await _context.Users
            .Include(u => u.Session)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
            return Unauthorized(new { message = "User account not found." });

        if (user.Session != null && !user.Session.IsActive)
            return Unauthorized(new { message = "Account suspended." });

        if (!IsAllowedAdminRole(user.Role))
            return StatusCode(403, new { message = "Access denied." });

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
    public async Task<IActionResult> Verify()
    {
        var (auth, user) = await GetAdminUserAsync();
        if (!auth || user == null)
            return Unauthorized(new { authenticated = false, message = "Admin session invalid or expired." });

        return Ok(new
        {
            authenticated = true,
            role = user.Role == UserRole.SuperAdmin ? "Super Admin" : user.Role.ToString(),
            userId = user.Id,
            name = user.Name,
            email = user.Email
        });
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetDashboardStats()
    {
        if (!await IsAdminAuthenticatedAsync())
            return Unauthorized();

        var utcNow = DateTime.UtcNow;
        var bakuNow = utcNow.AddHours(4);
        var startOfBakuMonth = new DateTime(bakuNow.Year, bakuNow.Month, 1, 0, 0, 0, DateTimeKind.Unspecified);
        var endOfBakuMonth = startOfBakuMonth.AddMonths(1);

        var startUtc = DateTime.SpecifyKind(startOfBakuMonth.AddHours(-4), DateTimeKind.Utc);
        var endUtc = DateTime.SpecifyKind(endOfBakuMonth.AddHours(-4), DateTimeKind.Utc);

        var monthlyOrders = await _context.Orders
            .AsNoTracking()
            .Where(o => o.CreatedAt >= startUtc && o.CreatedAt < endUtc)
            .ToListAsync();

        var validMonthlyOrders = monthlyOrders
            .Where(o => string.IsNullOrWhiteSpace(o.Status) || !o.Status.Contains("Cancel", StringComparison.OrdinalIgnoreCase))
            .ToList();

        var monthlyProductsSold = validMonthlyOrders
            .Where(o => o.Items != null)
            .SelectMany(o => o.Items)
            .Sum(i => i.Quantity);

        var monthlyProfit = validMonthlyOrders
            .Sum(o => o.Payment != null ? o.Payment.TotalAmount : 0m);

        var monthlyPromoDiscounts = validMonthlyOrders
            .Sum(o => o.Payment != null ? o.Payment.DiscountAmount : 0m);

        var users = await _context.Users
            .Include(u => u.Session)
            .AsNoTracking()
            .ToListAsync();

        var monthlyRegistrations = users.Count(u =>
        {
            var regDate = u.Session?.Sessions?
                .OrderBy(s => s.CreatedAt)
                .Select(s => (DateTime?)s.CreatedAt)
                .FirstOrDefault();

            if (!regDate.HasValue) return false;
            return regDate.Value >= startUtc && regDate.Value < endUtc;
        });

        var activeThreshold = utcNow.AddMinutes(-15);
        var onlineUsersCount = users.Count(u =>
            u.Session?.IsActive != false &&
            (u.Session?.Sessions?.Any(s =>
                s.IsActive != false &&
                s.RefreshTokenExpiryTime > utcNow &&
                (s.LastActiveAt ?? s.CreatedAt) >= activeThreshold
            ) ?? false)
        );

        var allReviews = await _context.Reviews
            .AsNoTracking()
            .ToListAsync();

        var monthlyReviews = allReviews.Where(r =>
        {
            var inBakuDirect = r.CreatedAt >= startOfBakuMonth && r.CreatedAt < endOfBakuMonth;
            var inUtcRange = r.CreatedAt >= startUtc && r.CreatedAt < endUtc;
            return inBakuDirect || inUtcRange;
        }).ToList();

        var monthlyReviewCount = monthlyReviews.Count;
        var monthlyReviewersCount = monthlyReviews.Select(r => r.UserId).Distinct().Count();
        var monthlyAverageRating = monthlyReviewCount > 0
            ? Math.Round(monthlyReviews.Average(r => r.ReviewData != null ? r.ReviewData.Rating : 0m), 2)
            : 0.0m;

        var allPromos = await _context.UserPromos
            .AsNoTracking()
            .ToListAsync();

        var monthlyPromosCreated = allPromos.Count(p =>
        {
            var created = p.Dates != null ? p.Dates.ActivatedAt : DateTime.MinValue;
            var inBakuDirect = created >= startOfBakuMonth && created < endOfBakuMonth;
            var inUtcRange = created >= startUtc && created < endUtc;
            return inBakuDirect || inUtcRange;
        });

        var monthNameRu = bakuNow.ToString("MMMM yyyy", System.Globalization.CultureInfo.GetCultureInfo("ru-RU"));
        if (!string.IsNullOrEmpty(monthNameRu))
        {
            monthNameRu = char.ToUpper(monthNameRu[0]) + monthNameRu[1..];
        }

        return Ok(new
        {
            monthName = monthNameRu,
            bakuCurrentTime = bakuNow.ToString("dd.MM.yyyy HH:mm"),
            productsSold = monthlyProductsSold,
            profit = monthlyProfit,
            profitFormatted = $"{monthlyProfit:0.00} ₼",
            registrations = monthlyRegistrations,
            onlineUsers = onlineUsersCount,
            averageRating = monthlyAverageRating,
            averageRatingFormatted = monthlyAverageRating > 0 ? monthlyAverageRating.ToString("0.0") : "0.0",
            ratingUsersCount = monthlyReviewersCount,
            totalReviewsCount = monthlyReviewCount,
            promosCreated = monthlyPromosCreated,
            promoSpent = monthlyPromoDiscounts,
            promoSpentFormatted = $"{monthlyPromoDiscounts:0.00} ₼"
        });
    }
    
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        if (!await IsFullAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Super Admin and Admin roles can manage users." });

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
        if (!await IsFullAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Super Admin and Admin roles can access user details." });

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
        if (!await IsFullAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Super Admin and Admin roles can update users." });

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
        {
            var newBalance = Math.Max(0, Math.Round(request.Balance.Value, 2));
            if (newBalance != user.Balance)
            {
                if (currentUser?.Role != UserRole.SuperAdmin)
                {
                    return StatusCode(403, new { message = "Only Super Admin can change user balance." });
                }
                user.Balance = newBalance;
            }
        }

        if (!string.IsNullOrWhiteSpace(request.Role))
        {
            var cleanRole = request.Role.Trim().Replace(" ", "");
            if (Enum.TryParse<UserRole>(cleanRole, true, out var parsedRole))
            {
                if (parsedRole != user.Role)
                {
                    if (user.Role == UserRole.Bot || user.Role == UserRole.AI)
                    {
                        return BadRequest(new { message = "System roles 'Bot' and 'AI' can only be modified directly in the database." });
                    }

                    if (parsedRole == UserRole.Bot || parsedRole == UserRole.AI)
                    {
                        return BadRequest(new { message = "System roles 'Bot' and 'AI' cannot be assigned via the admin panel." });
                    }

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
        if (!await IsFullAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Super Admin and Admin roles can terminate user sessions." });

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
        if (!await IsFullAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Super Admin and Admin roles can delete users." });

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
        if (!await IsAdminAuthenticatedAsync())
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
                imageUrl = products.TryGetValue(i.ProductId, out var prod2) ? prod2.Images?.Image : null,
                images = products.TryGetValue(i.ProductId, out var prod2b) ? new { image = prod2b.Images?.Image ?? string.Empty, icon = prod2b.Images?.Icon ?? string.Empty } : null,
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
        if (!await IsAdminAuthenticatedAsync())
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
            imageUrl = products.TryGetValue(i.ProductId, out var prod2) ? prod2.Images?.Image : null,
            images = products.TryGetValue(i.ProductId, out var prod2b) ? new { image = prod2b.Images?.Image ?? string.Empty, icon = prod2b.Images?.Icon ?? string.Empty } : null,
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
        if (!await IsAdminAuthenticatedAsync())
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
        if (!await IsSuperAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Super Admin can delete orders." });

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
        if (!await IsFullAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Super Admin and Admin roles can upload files to database storage." });

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
        if (!await IsFullAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Super Admin and Admin roles can view database files." });

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
        if (!await IsSuperAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Super Admin can delete database files." });

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
        if (!await IsAdminAuthenticatedAsync())
            return Unauthorized();

        var cutoffTime = DateTime.UtcNow.AddHours(4).AddDays(-15);

        var expired = await _context.Reviews
            .Where(r => r.Status.Status == ReviewStatus.Cancelled && r.Status.UpdatedAt <= cutoffTime)
            .ToListAsync();

        if (expired.Count > 0)
        {
            _context.Reviews.RemoveRange(expired);
            await _context.SaveChangesAsync();
        }

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
        if (!await IsAdminAuthenticatedAsync())
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
        if (!await IsAdminAuthenticatedAsync())
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
        if (!await IsSuperAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Super Admin can delete reviews." });

        var review = await _context.Reviews.FirstOrDefaultAsync(r => r.Id == id);
        if (review == null)
            return NotFound(new { message = "Review not found." });

        _context.Reviews.Remove(review);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Review deleted successfully." });
    }

    [HttpGet("promos")]
    public async Task<IActionResult> GetPromos()
    {
        if (!await IsFullAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Admin and Super Admin roles can access promos." });

        var promos = await _context.UserPromos
            .AsNoTracking()
            .OrderByDescending(p => p.Dates.ActivatedAt)
            .ToListAsync();

        var pixel = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == "myrednest@gmail.com");
        var userIds = promos.Where(p => pixel == null || p.UserId != pixel.Id).Select(p => p.UserId).Distinct().ToList();

        var users = await _context.Users
            .Where(u => userIds.Contains(u.Id))
            .AsNoTracking()
            .ToDictionaryAsync(u => u.Id);

        var now = DateTime.UtcNow;

        var result = promos.Select(p =>
        {
            var isUnclaimed = pixel != null && p.UserId == pixel.Id;
            var isExpired = p.Dates.ExpiresAt < now;
            users.TryGetValue(p.UserId, out var claimedUser);

            return new
            {
                id = p.Id,
                promoCode = p.Codes.PromoCode,
                barCode = p.Codes.BarCode,
                prizeType = p.PrizeInfo.Type.ToString(),
                prizeName = p.PrizeInfo.PrizeName,
                prizeDescription = p.PrizeInfo.PrizeDescription,
                discountPercent = p.PrizeInfo.DiscountPercent,
                cashbackPercent = p.PrizeInfo.CashbackPercent,
                isClaimed = !isUnclaimed,
                isActive = p.IsActive,
                isExpired = isExpired,
                status = !p.IsActive ? "Inactive" : isExpired ? "Expired" : isUnclaimed ? "Unclaimed" : "Claimed",
                activatedAt = p.Dates.ActivatedAt,
                expiresAt = p.Dates.ExpiresAt,
                claimedBy = !isUnclaimed && claimedUser != null ? new
                {
                    id = claimedUser.Id,
                    name = claimedUser.Name,
                    email = claimedUser.Email,
                    avatarUrl = claimedUser.ProfilePictureUrl,
                    role = claimedUser.Role.ToString()
                } : null
            };
        }).ToList();

        return Ok(result);
    }

    [HttpPost("promos")]
    public async Task<IActionResult> CreatePromo([FromBody] AdminCreatePromoRequest request)
    {
        if (!await IsFullAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Admin and Super Admin roles can create promos." });

        var pixel = await _context.Users.FirstOrDefaultAsync(u => u.Email == "myrednest@gmail.com");
        if (pixel == null)
            return StatusCode(500, new { message = "Pixel system user account is not initialized." });

        var expiryDays = Math.Clamp(request.ExpiryDays, 1, 30);
        var now = DateTime.UtcNow;

        var typeStr = (request.PrizeType ?? "DiscountCustom").Trim();
        PrizeType pType;
        if (!Enum.TryParse<PrizeType>(typeStr, true, out pType))
        {
            pType = PrizeType.DiscountCustom;
        }

        int discountPercent = Math.Clamp(request.DiscountPercent ?? 0, 0, 100);
        int cashbackPercent = Math.Clamp(request.CashbackPercent ?? 0, 0, 100);

        if (pType == PrizeType.Discount25 && discountPercent == 0) discountPercent = 25;
        if (pType == PrizeType.Discount50 && discountPercent == 0) discountPercent = 50;

        string prizeName = !string.IsNullOrWhiteSpace(request.PrizeName)
            ? request.PrizeName.Trim()
            : pType switch
            {
                PrizeType.DiscountCustom => $"{discountPercent}% Discount",
                PrizeType.Discount25 => "25% Discount",
                PrizeType.Discount50 => "50% Discount",
                PrizeType.CashbackOnPurchases => $"{cashbackPercent}% Cashback",
                PrizeType.FreeDrink => "Free Drink",
                PrizeType.FreeDessert => "Free Dessert",
                PrizeType.SuperPrize => "Super Prize",
                _ => "Special Promotion"
            };

        string prizeDescription = !string.IsNullOrWhiteSpace(request.PrizeDescription)
            ? request.PrizeDescription.Trim()
            : pType switch
            {
                PrizeType.DiscountCustom => $"Get {discountPercent}% off your entire order.",
                PrizeType.Discount25 => "Get 25% off your next order.",
                PrizeType.Discount50 => "Get 50% off your next order.",
                PrizeType.CashbackOnPurchases => $"Earn {cashbackPercent}% cashback on your purchase.",
                PrizeType.FreeDrink => "Enjoy one free drink with your next order.",
                PrizeType.FreeDessert => "Enjoy one free dessert with your next order.",
                PrizeType.SuperPrize => "Exclusive Super Prize bonus on your order.",
                _ => "Exclusive reward from Rednest."
            };

        var promoId = Guid.NewGuid();
        var barCode = new string(promoId.ToString().Where(char.IsDigit).ToArray());
        var promoCode = promoId.ToString("N")[..8].ToUpper();

        var promo = new UserPromo
        {
            Id = promoId,
            UserId = pixel.Id,
            Codes = new PromoCodes
            {
                PromoCode = promoCode,
                BarCode = barCode
            },
            PrizeInfo = new PrizeInfo
            {
                Type = pType,
                PrizeName = prizeName,
                PrizeDescription = prizeDescription,
                DiscountPercent = discountPercent,
                CashbackPercent = cashbackPercent
            },
            Dates = new PromoDates
            {
                ActivatedAt = now,
                ExpiresAt = now.AddDays(expiryDays)
            },
            IsActive = true
        };

        _context.UserPromos.Add(promo);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Promo code created successfully.",
            promo = new
            {
                id = promo.Id,
                promoCode = promo.Codes.PromoCode,
                barCode = promo.Codes.BarCode,
                prizeType = promo.PrizeInfo.Type.ToString(),
                prizeName = promo.PrizeInfo.PrizeName,
                prizeDescription = promo.PrizeInfo.PrizeDescription,
                discountPercent = promo.PrizeInfo.DiscountPercent,
                cashbackPercent = promo.PrizeInfo.CashbackPercent,
                isClaimed = false,
                isActive = promo.IsActive,
                isExpired = false,
                status = "Unclaimed",
                activatedAt = promo.Dates.ActivatedAt,
                expiresAt = promo.Dates.ExpiresAt
            }
        });
    }

    [HttpPatch("promos/{id:guid}/toggle-active")]
    public async Task<IActionResult> TogglePromoActive(Guid id)
    {
        if (!await IsSuperAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Super Admin can change promo active status." });

        var promo = await _context.UserPromos.FirstOrDefaultAsync(p => p.Id == id);
        if (promo == null)
            return NotFound(new { message = "Promo code not found." });

        promo.IsActive = !promo.IsActive;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = promo.IsActive ? "Promo code activated." : "Promo code deactivated.",
            id = promo.Id,
            isActive = promo.IsActive
        });
    }

    [HttpDelete("promos/{id:guid}")]
    public async Task<IActionResult> DeletePromo(Guid id)
    {
        if (!await IsSuperAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Super Admin can delete promo codes." });

        var promo = await _context.UserPromos.FirstOrDefaultAsync(p => p.Id == id);
        if (promo == null)
            return NotFound(new { message = "Promo code not found." });

        _context.UserPromos.Remove(promo);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Promo code deleted successfully." });
    }

    [HttpGet("products")]
    public async Task<IActionResult> GetProducts()
    {
        if (!await IsAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Moderator, Admin and Super Admin roles can access products." });

        var products = await _context.Products
            .AsNoTracking()
            .OrderBy(p => p.Category)
            .ThenBy(p => p.Prices != null ? (p.Prices.DiscountPrice ?? p.Prices.Price) : 0m)
            .ToListAsync();

        var orders = await _context.Orders
            .AsNoTracking()
            .Select(o => o.Items)
            .ToListAsync();

        var salesCountByProduct = orders
            .Where(items => items != null)
            .SelectMany(items => items)
            .GroupBy(i => i.ProductId)
            .ToDictionary(g => g.Key, g => g.Sum(i => i.Quantity));

        return Ok(products.Select(p => new
        {
            id = p.Id,
            name = p.Name,
            description = p.Description,
            price = (p.Prices?.DiscountPrice ?? p.Prices?.Price) ?? 0m,
            formattedPrice = ((p.Prices?.DiscountPrice ?? p.Prices?.Price) ?? 0m).ToString("0.00"),
            prices = new
            {
                price = p.Prices != null ? p.Prices.Price.ToString("0.00") : "0.00",
                discountPrice = p.Prices?.DiscountPrice != null ? p.Prices.DiscountPrice.Value.ToString("0.00") : null
            },
            images = new { image = p.Images != null ? p.Images.Image : string.Empty, icon = p.Images != null ? p.Images.Icon : string.Empty },
            category = p.Category,
            isActive = p.IsActive,
            totalSold = salesCountByProduct.TryGetValue(p.Id, out var sold) ? sold : 0
        }));
    }

    [HttpGet("products/{id:guid}")]
    public async Task<IActionResult> GetProduct(Guid id)
    {
        if (!await IsAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied." });

        var product = await _context.Products
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id);

        if (product == null)
            return NotFound(new { message = "Product not found." });

        var ordersWithProduct = await _context.Orders
            .AsNoTracking()
            .Select(o => o.Items)
            .ToListAsync();

        var totalSold = ordersWithProduct
            .Where(items => items != null)
            .SelectMany(items => items)
            .Where(i => i.ProductId == id)
            .Sum(i => i.Quantity);

        return Ok(new
        {
            id = product.Id,
            name = product.Name,
            description = product.Description,
            price = (product.Prices?.DiscountPrice ?? product.Prices?.Price) ?? 0m,
            formattedPrice = ((product.Prices?.DiscountPrice ?? product.Prices?.Price) ?? 0m).ToString("0.00"),
            prices = new
            {
                price = product.Prices != null ? product.Prices.Price.ToString("0.00") : "0.00",
                discountPrice = product.Prices?.DiscountPrice != null ? product.Prices.DiscountPrice.Value.ToString("0.00") : null
            },
            images = new { image = product.Images != null ? product.Images.Image : string.Empty, icon = product.Images != null ? product.Images.Icon : string.Empty },
            category = product.Category,
            isActive = product.IsActive,
            totalSold = totalSold
        });
    }

    [HttpPost("products")]
    public async Task<IActionResult> CreateProduct([FromBody] AdminProductRequest request)
    {
        if (!await IsAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Moderator, Admin and Super Admin can add products." });

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Product name is required." });

        if (request.Name.Trim().Length > 50)
            return BadRequest(new { message = "Product name cannot exceed 50 characters." });

        if (request.Description != null && request.Description.Trim().Length > 250)
            return BadRequest(new { message = "Product description cannot exceed 250 characters." });

        var basePrice = request.Prices?.Price ?? request.Price;
        if (!basePrice.HasValue || basePrice.Value < 0)
            return BadRequest(new { message = "A valid product price is required." });

        var discountPrice = request.Prices?.DiscountPrice ?? request.DiscountPrice;
        if (discountPrice.HasValue && discountPrice.Value < 0)
            return BadRequest(new { message = "Discount price cannot be negative." });

        var category = string.IsNullOrWhiteSpace(request.Category) ? "Main Drinks" : request.Category.Trim();

        var product = new Rednest.Core.Entities.Product
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            Prices = new Rednest.Core.Entities.ProductPrices
            {
                Price = basePrice.Value,
                DiscountPrice = discountPrice
            },
            Images = new Rednest.Core.Entities.ProductImages
            {
                Image = request.ImageUrl?.Trim() ?? string.Empty,
                Icon = request.IconUrl?.Trim() ?? string.Empty
            },
            Category = category,
            IsActive = request.IsActive ?? true
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Product created successfully.",
            id = product.Id,
            name = product.Name,
            description = product.Description,
            price = (product.Prices?.DiscountPrice ?? product.Prices?.Price) ?? 0m,
            formattedPrice = ((product.Prices?.DiscountPrice ?? product.Prices?.Price) ?? 0m).ToString("0.00"),
            prices = new
            {
                price = product.Prices?.Price.ToString("0.00") ?? "0.00",
                discountPrice = product.Prices?.DiscountPrice?.ToString("0.00")
            },
            images = new { image = product.Images.Image, icon = product.Images.Icon },
            category = product.Category,
            isActive = product.IsActive
        });
    }

    [HttpPut("products/{id:guid}")]
    public async Task<IActionResult> UpdateProduct(Guid id, [FromBody] AdminProductRequest request)
    {
        if (!await IsAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Moderator, Admin and Super Admin can edit products." });

        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id);
        if (product == null)
            return NotFound(new { message = "Product not found." });

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            if (request.Name.Trim().Length > 50)
                return BadRequest(new { message = "Product name cannot exceed 50 characters." });
            product.Name = request.Name.Trim();
        }

        if (request.Description != null)
        {
            if (request.Description.Trim().Length > 250)
                return BadRequest(new { message = "Product description cannot exceed 250 characters." });
            product.Description = request.Description.Trim();
        }

        product.Prices ??= new Rednest.Core.Entities.ProductPrices();
        product.Images ??= new Rednest.Core.Entities.ProductImages();

        var basePrice = request.Prices?.Price ?? request.Price;
        if (basePrice.HasValue && basePrice.Value >= 0)
        {
            product.Prices.Price = basePrice.Value;
        }

        if (request.Prices != null)
        {
            product.Prices.DiscountPrice = request.Prices.DiscountPrice;
        }
        else if (request.DiscountPrice.HasValue)
        {
            product.Prices.DiscountPrice = request.DiscountPrice.Value;
        }

        if (request.ImageUrl != null)
            product.Images.Image = request.ImageUrl.Trim();

        if (request.IconUrl != null)
            product.Images.Icon = request.IconUrl.Trim();

        if (!string.IsNullOrWhiteSpace(request.Category))
            product.Category = request.Category.Trim();

        if (request.IsActive.HasValue)
            product.IsActive = request.IsActive.Value;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Product updated successfully.",
            id = product.Id,
            name = product.Name,
            description = product.Description,
            price = (product.Prices?.DiscountPrice ?? product.Prices?.Price) ?? 0m,
            formattedPrice = ((product.Prices?.DiscountPrice ?? product.Prices?.Price) ?? 0m).ToString("0.00"),
            prices = new
            {
                price = product.Prices?.Price.ToString("0.00") ?? "0.00",
                discountPrice = product.Prices?.DiscountPrice?.ToString("0.00")
            },
            images = new { image = product.Images.Image, icon = product.Images.Icon },
            category = product.Category,
            isActive = product.IsActive
        });
    }

    [HttpPatch("products/{id:guid}/toggle-active")]
    public async Task<IActionResult> ToggleProductActive(Guid id)
    {
        if (!await IsAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Moderator, Admin and Super Admin can toggle product status." });

        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id);
        if (product == null)
            return NotFound(new { message = "Product not found." });

        product.IsActive = !product.IsActive;
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Product status updated.", isActive = product.IsActive });
    }

    [HttpDelete("products/{id:guid}")]
    public async Task<IActionResult> DeleteProduct(Guid id)
    {
        if (!await IsSuperAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Super Admin can delete products." });

        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id);
        if (product == null)
            return NotFound(new { message = "Product not found." });

        _context.Products.Remove(product);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Product deleted successfully." });
    }

    private static bool IsAllowedAdminRole(UserRole role)
    {
        return role == UserRole.Moderator || role == UserRole.Admin || role == UserRole.SuperAdmin;
    }

    private static bool IsFullAdminRole(UserRole role)
    {
        return role == UserRole.Admin || role == UserRole.SuperAdmin;
    }

    private static bool IsSuperAdminRole(UserRole role)
    {
        return role == UserRole.SuperAdmin;
    }

    private async Task<(bool Authenticated, User? User)> GetAdminUserAsync()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            return (false, null);

        var user = await _context.Users
            .Include(u => u.Session)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || !IsAllowedAdminRole(user.Role))
            return (false, null);

        if (user.Session != null && !user.Session.IsActive)
            return (false, null);

        return (true, user);
    }

    private async Task<bool> IsAdminAuthenticatedAsync()
    {
        var (auth, _) = await GetAdminUserAsync();
        return auth;
    }

    private async Task<bool> IsFullAdminAuthenticatedAsync()
    {
        var (auth, user) = await GetAdminUserAsync();
        return auth && user != null && IsFullAdminRole(user.Role);
    }

    private async Task<bool> IsSuperAdminAuthenticatedAsync()
    {
        var (auth, user) = await GetAdminUserAsync();
        return auth && user != null && IsSuperAdminRole(user.Role);
    }

    private static string GetAdminSigningKey()
    {
        var key = Environment.GetEnvironmentVariable("ADMIN_SECRET") ?? "";
        var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? "";
        return $"admin_session_{key}_{jwtSecret}";
    }

    private static string GenerateSignedAdminToken(string userId)
    {
        var key = Encoding.UTF8.GetBytes(GetAdminSigningKey());
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var payload = $"{userId}:{timestamp}";
        var payloadBytes = Encoding.UTF8.GetBytes(payload);
        var hash = HMACSHA256.HashData(key, payloadBytes);
        var signature = Convert.ToBase64String(hash);
        return $"{payload}:{signature}";
    }

    private static bool ValidateSignedAdminToken(string token, string expectedUserId)
    {
        try
        {
            var parts = token.Split(':');
            if (parts.Length != 3)
                return false;

            var userId = parts[0];
            var timestampStr = parts[1];
            var signature = parts[2];

            if (userId != expectedUserId)
                return false;

            if (!long.TryParse(timestampStr, out var timestamp))
                return false;

            var tokenTime = DateTimeOffset.FromUnixTimeSeconds(timestamp);
            if (DateTimeOffset.UtcNow - tokenTime > TimeSpan.FromHours(AdminSessionHours))
                return false;

            var key = Encoding.UTF8.GetBytes(GetAdminSigningKey());
            var payload = $"{userId}:{timestampStr}";
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

public class AdminProductPricesRequest
{
    public decimal? Price { get; set; }
    public decimal? DiscountPrice { get; set; }
}

public class AdminProductRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public decimal? Price { get; set; }
    public decimal? DiscountPrice { get; set; }
    public AdminProductPricesRequest? Prices { get; set; }
    public string? ImageUrl { get; set; }
    public string? IconUrl { get; set; }
    public string? Category { get; set; }
    public bool? IsActive { get; set; }
}

public class AdminCreatePromoRequest
{
    public string? PromoCode { get; set; }
    public string? PrizeType { get; set; }
    public int? DiscountPercent { get; set; }
    public int? CashbackPercent { get; set; }
    public string? PrizeName { get; set; }
    public string? PrizeDescription { get; set; }
    public int ExpiryDays { get; set; } = 7;
}
