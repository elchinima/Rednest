namespace Rednest.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly AppDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IAnalyticsTrackingService _analyticsTrackingService;

    private static readonly string[] AllowedExtensions = [".png", ".jpg", ".jpeg"];
    private const long MaxFileSizeBytes = 10 * 1024 * 1024;
    private const int AdminSessionHours = 8;

    public AdminController(
        IHttpClientFactory httpClientFactory,
        AppDbContext context,
        IEmailService emailService,
        IAnalyticsTrackingService analyticsTrackingService)
    {
        _httpClientFactory = httpClientFactory;
        _context = context;
        _emailService = emailService;
        _analyticsTrackingService = analyticsTrackingService;
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
        if (string.IsNullOrEmpty(adminSecret) || string.IsNullOrEmpty(request.Password))
            return Unauthorized(new { message = "Incorrect password." });

        var secretBytes = System.Text.Encoding.UTF8.GetBytes(adminSecret);
        var inputBytes = System.Text.Encoding.UTF8.GetBytes(request.Password);
        if (secretBytes.Length != inputBytes.Length ||
            !System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(secretBytes, inputBytes))
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
            role = user.Role == UserRole.SuperAdmin ? "Super Admin" : (user.Role == UserRole.LeadStaff ? "Lead Staff" : user.Role.ToString()),
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

        _ = Task.Run(() => _analyticsTrackingService.TrackAnalyticsAsync());

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

        var monthNameEn = bakuNow.ToString("MMMM yyyy", System.Globalization.CultureInfo.InvariantCulture);
        var monthYearAnalyticsKey = bakuNow.ToString("MMMM, yyyy", System.Globalization.CultureInfo.InvariantCulture);
        var todayDate = bakuNow.ToString("yyyy-MM-dd");

        var analyticsRecord = await _context.Analytics
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.MonthYear == monthYearAnalyticsKey);

        var emailsSentToday = 0;
        var emailsDailyLimit = 300;
        var emailsMonthlyTotal = 0;

        if (analyticsRecord?.EmailsSent != null)
        {
            emailsDailyLimit = analyticsRecord.EmailsSent.DailyLimit > 0 ? analyticsRecord.EmailsSent.DailyLimit : 300;
            var todayEntry = analyticsRecord.EmailsSent.Days?.FirstOrDefault(d => d.Date == todayDate);
            emailsSentToday = todayEntry?.SentCount ?? analyticsRecord.EmailsSent.TodaySent;
            emailsMonthlyTotal = analyticsRecord.EmailsSent.MonthlyTotal;
        }

        var emailsRemainingToday = Math.Max(0, emailsDailyLimit - emailsSentToday);

        return Ok(new
        {
            monthName = monthNameEn,
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
            promoSpentFormatted = $"{monthlyPromoDiscounts:0.00} ₼",
            emailsSentToday = emailsSentToday,
            emailsDailyLimit = emailsDailyLimit,
            emailsRemainingToday = emailsRemainingToday,
            emailsMonthlyTotal = emailsMonthlyTotal,
            emailsDailyHistory = analyticsRecord?.EmailsSent?.Days ?? new List<DailyEmailRecord>()
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
                role = u.Role == UserRole.SuperAdmin ? "Super Admin" : (u.Role == UserRole.LeadStaff ? "Lead Staff" : u.Role.ToString()),
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
            role = user.Role == UserRole.SuperAdmin ? "Super Admin" : (user.Role == UserRole.LeadStaff ? "Lead Staff" : user.Role.ToString()),
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
            currentUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == currentUserId);

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

        var currentUserRole = currentUser?.Role ?? UserRole.Customer;
        var currentUserLevel = GetUserRoleLevel(currentUserRole);
        var targetUserLevel = GetUserRoleLevel(user.Role);

        if (currentUserId != id && currentUserLevel <= targetUserLevel)
            return StatusCode(403, new { message = $"Access denied. You cannot modify the data of a user with an equal or higher role ({user.Role})." });

        var oldName = user.Name;
        var oldBalance = user.Balance;
        var oldRole = user.Role.ToString();
        var oldIsActive = user.Session?.IsActive;
        var oldTwoFactor = user.Session?.TwoFactorEnabled;
        var oldSubscribe = user.Session?.Subscribe;

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
            var cleanRoleStr = request.Role.Replace(" ", "");
            if (Enum.TryParse<UserRole>(cleanRoleStr, true, out var parsedRole))
            {
                if (user.Role != parsedRole)
                {
                    var isEditingSelf = currentUserId == id;

                    if (parsedRole == UserRole.Bot || parsedRole == UserRole.AI)
                    {
                        return BadRequest(new { message = "System roles 'Bot' and 'AI' cannot be assigned via the admin panel." });
                    }

                    if (isEditingSelf)
                    {
                        return BadRequest(new { message = "You cannot change your own role." });
                    }

                    if (targetUserLevel >= currentUserLevel)
                    {
                        return BadRequest(new { message = "You cannot modify the role of a user with an equal or higher role than yours." });
                    }

                    var parsedRoleLevel = GetUserRoleLevel(parsedRole);
                    if (parsedRoleLevel >= currentUserLevel)
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

        var changes = new Dictionary<string, object>();
        if (oldName != user.Name) changes["name"] = new { from = oldName, to = user.Name };
        if (oldBalance != user.Balance) changes["balance"] = new { from = oldBalance, to = user.Balance };
        if (oldRole != user.Role.ToString()) changes["role"] = new { from = oldRole, to = user.Role.ToString() };
        if (oldIsActive != user.Session?.IsActive) changes["isActive"] = new { from = oldIsActive, to = user.Session?.IsActive };
        if (oldTwoFactor != user.Session?.TwoFactorEnabled) changes["twoFactor"] = new { from = oldTwoFactor, to = user.Session?.TwoFactorEnabled };
        if (oldSubscribe != user.Session?.Subscribe) changes["subscribe"] = new { from = oldSubscribe, to = user.Session?.Subscribe };

        var (auth, adminUser) = await GetAdminUserAsync();
        await LogAdminActionAsync(
            adminUser?.Id,
            adminUser?.Role.ToString() ?? "Admin",
            "Users",
            "PUT",
            new
            {
                action = "UpdateUser",
                targetUserId = id,
                targetEmail = user.Email,
                targetName = user.Name,
                changes = changes.Count > 0 ? changes : null,
                before = new { name = oldName, balance = oldBalance, role = oldRole, isActive = oldIsActive },
                after = new { name = user.Name, balance = user.Balance, role = user.Role.ToString(), isActive = user.Session?.IsActive }
            });

        return Ok(new
        {
            message = "User updated successfully.",
            user = new
            {
                user.Id,
                user.Name,
                user.Email,
                user.Balance,
                role = user.Role == UserRole.SuperAdmin ? "Super Admin" : (user.Role == UserRole.LeadStaff ? "Lead Staff" : user.Role.ToString()),
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

        var (auth, adminUser) = await GetAdminUserAsync();
        await LogAdminActionAsync(
            adminUser?.Id,
            adminUser?.Role.ToString() ?? "Admin",
            "Users",
            "POST",
            new
            {
                action = "TerminateUserSessions",
                targetUserId = id
            });

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

        var targetEmail = user.Email;
        var targetName = user.Name;
        var targetRole = user.Role.ToString();

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        var (auth, adminUser) = await GetAdminUserAsync();
        await LogAdminActionAsync(
            adminUser?.Id,
            adminUser?.Role.ToString() ?? "Admin",
            "Users",
            "DELETE",
            new
            {
                action = "DeleteUser",
                targetUserId = id,
                targetEmail = targetEmail,
                targetName = targetName,
                targetRole = targetRole
            });

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

        var prevStatus = order.Status;
        order.Status = request.Status.Trim();
        await _context.SaveChangesAsync();

        var (auth, adminUser) = await GetAdminUserAsync();
        await LogAdminActionAsync(
            adminUser?.Id,
            adminUser?.Role.ToString() ?? "Admin",
            "Orders",
            "PUT",
            new
            {
                action = "UpdateOrderStatus",
                orderId = id,
                userId = order.UserId,
                changes = new { status = new { from = prevStatus, to = order.Status } },
                before = new { status = prevStatus },
                after = new { status = order.Status }
            });

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

        var orderUserId = order.UserId;
        var orderStatus = order.Status;
        var totalAmount = order.Payment?.TotalAmount ?? 0m;

        _context.Orders.Remove(order);
        await _context.SaveChangesAsync();

        var (auth, adminUser) = await GetAdminUserAsync();
        await LogAdminActionAsync(
            adminUser?.Id,
            adminUser?.Role.ToString() ?? "Admin",
            "Orders",
            "DELETE",
            new
            {
                action = "DeleteOrder",
                orderId = id,
                userId = orderUserId,
                status = orderStatus,
                totalAmount = totalAmount
            });

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

        var fileNameWithoutExt = Path.GetFileNameWithoutExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(fileNameWithoutExt) ||
            !System.Text.RegularExpressions.Regex.IsMatch(fileNameWithoutExt, @"^[a-zA-Z0-9\s._\-()]+$") ||
            !System.Text.RegularExpressions.Regex.IsMatch(fileNameWithoutExt, @"[a-zA-Z0-9]"))
        {
            return BadRequest(new
            {
                message = $"File name must contain only English letters and numbers. Russian/Cyrillic characters are not supported ('{file.FileName}')."
            });
        }

        await using var inputStream = file.OpenReadStream();
        using var image = await Image.LoadAsync(inputStream);

        image.Mutate(x => x.Resize(image.Width / 2, image.Height / 2));

        await using var outputStream = new MemoryStream();
        var encoder = new WebpEncoder { Quality = 50 };
        await image.SaveAsync(outputStream, encoder);
        outputStream.Position = 0;

        var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL");
        var serviceKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY");

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
            return BadRequest(new { message = $"Supabase upload error: {err}" });
        }

        var publicUrl = $"{supabaseUrl}/storage/v1/object/public/admin-files/{storagePath}";
        var sizeKb = Math.Round(outputStream.Length / 1024.0, 1);

        var (auth, adminUser) = await GetAdminUserAsync();
        await LogAdminActionAsync(
            adminUser?.Id,
            adminUser?.Role.ToString() ?? "Admin",
            "Database",
            "POST",
            new
            {
                action = "UploadFile",
                fileName = uniqueName,
                storagePath = storagePath,
                publicUrl = publicUrl,
                sizeKb = sizeKb
            });

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

        var (auth, adminUser) = await GetAdminUserAsync();
        await LogAdminActionAsync(
            adminUser?.Id,
            adminUser?.Role.ToString() ?? "Admin",
            "Database",
            "DELETE",
            new
            {
                action = "DeleteFile",
                fileName = fileName,
                storagePath = storagePath
            });

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

        var prevStatus = review.Status.Status.ToString();
        review.Status.Status = statusEnum;
        review.Status.UpdatedAt = DateTime.UtcNow.AddHours(4);
        await _context.SaveChangesAsync();

        var (auth, adminUser) = await GetAdminUserAsync();
        await LogAdminActionAsync(
            adminUser?.Id,
            adminUser?.Role.ToString() ?? "Admin",
            "Reviews",
            "PUT",
            new
            {
                action = "UpdateReviewStatus",
                reviewId = id,
                userId = review.UserId,
                orderId = review.OrderId,
                changes = new { status = new { from = prevStatus, to = statusEnum.ToString() } },
                before = new { status = prevStatus },
                after = new { status = statusEnum.ToString() }
            });

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

        var targetUserId = review.UserId;
        var targetOrderId = review.OrderId;

        _context.Reviews.Remove(review);
        await _context.SaveChangesAsync();

        var (auth, adminUser) = await GetAdminUserAsync();
        await LogAdminActionAsync(
            adminUser?.Id,
            adminUser?.Role.ToString() ?? "Admin",
            "Reviews",
            "DELETE",
            new
            {
                action = "DeleteReview",
                reviewId = id,
                userId = targetUserId,
                orderId = targetOrderId
            });

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

        var (auth, adminUser) = await GetAdminUserAsync();
        await LogAdminActionAsync(
            adminUser?.Id,
            adminUser?.Role.ToString() ?? "Admin",
            "Promos",
            "POST",
            new
            {
                action = "CreatePromo",
                promoId = promo.Id,
                promoCode = promo.Codes.PromoCode,
                prizeType = promo.PrizeInfo.Type.ToString(),
                prizeName = promo.PrizeInfo.PrizeName,
                discountPercent = promo.PrizeInfo.DiscountPercent,
                cashbackPercent = promo.PrizeInfo.CashbackPercent,
                expiryDays = expiryDays
            });

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

        var (auth, adminUser) = await GetAdminUserAsync();
        await LogAdminActionAsync(
            adminUser?.Id,
            adminUser?.Role.ToString() ?? "Admin",
            "Promos",
            "PATCH",
            new
            {
                action = "TogglePromoActive",
                promoId = id,
                promoCode = promo.Codes.PromoCode,
                changes = new { isActive = new { from = !promo.IsActive, to = promo.IsActive } },
                before = new { isActive = !promo.IsActive },
                after = new { isActive = promo.IsActive }
            });

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

        var promoCode = promo.Codes.PromoCode;

        _context.UserPromos.Remove(promo);
        await _context.SaveChangesAsync();

        var (auth, adminUser) = await GetAdminUserAsync();
        await LogAdminActionAsync(
            adminUser?.Id,
            adminUser?.Role.ToString() ?? "Admin",
            "Promos",
            "DELETE",
            new
            {
                action = "DeletePromo",
                promoId = id,
                promoCode = promoCode
            });

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
            name = p.Name.AZ,
            description = p.Description.AZ,
            nameTranslations = new
            {
                EN = p.Name.EN,
                RU = p.Name.RU,
                AZ = p.Name.AZ
            },
            descriptionTranslations = new
            {
                EN = p.Description.EN,
                RU = p.Description.RU,
                AZ = p.Description.AZ
            },
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
            name = product.Name.AZ,
            description = product.Description.AZ,
            nameTranslations = new
            {
                EN = product.Name.EN,
                RU = product.Name.RU,
                AZ = product.Name.AZ
            },
            descriptionTranslations = new
            {
                EN = product.Description.EN,
                RU = product.Description.RU,
                AZ = product.Description.AZ
            },
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

        var nameAZ = request.NameTranslations?.AZ?.Trim() ?? request.Name?.Trim() ?? string.Empty;
        var nameEN = request.NameTranslations?.EN?.Trim() ?? string.Empty;
        var nameRU = request.NameTranslations?.RU?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(nameAZ) && string.IsNullOrWhiteSpace(nameEN))
            return BadRequest(new { message = "Product name is required." });

        var descAZ = request.DescriptionTranslations?.AZ?.Trim() ?? request.Description?.Trim() ?? string.Empty;
        var descEN = request.DescriptionTranslations?.EN?.Trim() ?? string.Empty;
        var descRU = request.DescriptionTranslations?.RU?.Trim() ?? string.Empty;

        var product = new Rednest.Core.Entities.Product
        {
            Id = Guid.NewGuid(),
            Name = new Rednest.Core.Entities.ProductName { EN = nameEN, RU = nameRU, AZ = nameAZ },
            Description = new Rednest.Core.Entities.ProductDescription { EN = descEN, RU = descRU, AZ = descAZ },
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

        var (auth, adminUser) = await GetAdminUserAsync();
        await LogAdminActionAsync(
            adminUser?.Id,
            adminUser?.Role.ToString() ?? "Admin",
            "Products",
            "POST",
            new
            {
                action = "CreateProduct",
                productId = product.Id,
                productName = product.Name.AZ,
                category = product.Category,
                price = product.Prices.Price,
                discountPrice = product.Prices.DiscountPrice,
                isActive = product.IsActive
            });

        return Ok(new
        {
            message = "Product created successfully.",
            id = product.Id,
            name = product.Name.AZ,
            description = product.Description.AZ,
            nameTranslations = new { EN = nameEN, RU = nameRU, AZ = nameAZ },
            descriptionTranslations = new { EN = descEN, RU = descRU, AZ = descAZ },
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

        var oldName = product.Name.AZ;
        var oldCategory = product.Category;
        var oldPrice = product.Prices?.Price;
        var oldDiscountPrice = product.Prices?.DiscountPrice;
        var oldIsActive = product.IsActive;

        if (request.NameTranslations != null)
        {
            product.Name ??= new Rednest.Core.Entities.ProductName();
            if (request.NameTranslations.EN != null) product.Name.EN = request.NameTranslations.EN.Trim();
            if (request.NameTranslations.RU != null) product.Name.RU = request.NameTranslations.RU.Trim();
            if (request.NameTranslations.AZ != null) product.Name.AZ = request.NameTranslations.AZ.Trim();
        }
        else if (!string.IsNullOrWhiteSpace(request.Name))
        {
            if (request.Name.Trim().Length > 50)
                return BadRequest(new { message = "Product name cannot exceed 50 characters." });
            product.Name ??= new Rednest.Core.Entities.ProductName();
            product.Name.AZ = request.Name.Trim();
            product.Name.EN = request.Name.Trim();
        }

        if (request.DescriptionTranslations != null)
        {
            product.Description ??= new Rednest.Core.Entities.ProductDescription();
            if (request.DescriptionTranslations.EN != null) product.Description.EN = request.DescriptionTranslations.EN.Trim();
            if (request.DescriptionTranslations.RU != null) product.Description.RU = request.DescriptionTranslations.RU.Trim();
            if (request.DescriptionTranslations.AZ != null) product.Description.AZ = request.DescriptionTranslations.AZ.Trim();
        }
        else if (request.Description != null)
        {
            if (request.Description.Trim().Length > 250)
                return BadRequest(new { message = "Product description cannot exceed 250 characters." });
            product.Description ??= new Rednest.Core.Entities.ProductDescription();
            product.Description.AZ = request.Description.Trim();
            product.Description.EN = request.Description.Trim();
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
            if (request.Prices.Price.HasValue && request.Prices.Price.Value >= 0)
            {
                product.Prices.Price = request.Prices.Price.Value;
            }

            if (request.Prices.DiscountPrice.HasValue && request.Prices.DiscountPrice.Value < 0)
            {
                return BadRequest(new { message = "Discount price cannot be negative." });
            }

            product.Prices.DiscountPrice = request.Prices.DiscountPrice;
        }
        else if (request.DiscountPrice.HasValue)
        {
            if (request.DiscountPrice.Value < 0)
            {
                return BadRequest(new { message = "Discount price cannot be negative." });
            }

            product.Prices.DiscountPrice = request.DiscountPrice;
        }

        if (!string.IsNullOrWhiteSpace(request.ImageUrl))
            product.Images.Image = request.ImageUrl.Trim();

        if (!string.IsNullOrWhiteSpace(request.IconUrl))
            product.Images.Icon = request.IconUrl.Trim();

        if (!string.IsNullOrWhiteSpace(request.Category))
            product.Category = request.Category.Trim();

        if (request.IsActive.HasValue)
            product.IsActive = request.IsActive.Value;

        var changes = new List<string>();
        if (oldName != product.Name.AZ) changes.Add($"Name: '{oldName}' -> '{product.Name.AZ}'");
        if (oldCategory != product.Category) changes.Add($"Category: '{oldCategory}' -> '{product.Category}'");
        if (oldPrice != product.Prices?.Price) changes.Add($"Price: '{oldPrice}' -> '{product.Prices?.Price}'");
        if (oldDiscountPrice != product.Prices?.DiscountPrice) changes.Add($"DiscountPrice: '{oldDiscountPrice}' -> '{product.Prices?.DiscountPrice}'");
        if (oldIsActive != product.IsActive) changes.Add($"IsActive: '{oldIsActive}' -> '{product.IsActive}'");

        await _context.SaveChangesAsync();

        var (auth, adminUser) = await GetAdminUserAsync();
        await LogAdminActionAsync(
            adminUser?.Id,
            adminUser?.Role.ToString() ?? "Admin",
            "Products",
            "PUT",
            new
            {
                action = "UpdateProduct",
                productId = id,
                productName = product.Name.AZ,
                changes = changes.Count > 0 ? changes : null,
                before = new { name = oldName, category = oldCategory, price = oldPrice, discountPrice = oldDiscountPrice, isActive = oldIsActive },
                after = new { name = product.Name.AZ, category = product.Category, price = product.Prices?.Price, discountPrice = product.Prices?.DiscountPrice, isActive = product.IsActive }
            });

        return Ok(new
        {
            message = "Product updated successfully.",
            id = product.Id,
            name = product.Name.AZ,
            description = product.Description.AZ,
            nameTranslations = new { EN = product.Name.EN, RU = product.Name.RU, AZ = product.Name.AZ },
            descriptionTranslations = new { EN = product.Description.EN, RU = product.Description.RU, AZ = product.Description.AZ },
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

        var (auth, adminUser) = await GetAdminUserAsync();
        await LogAdminActionAsync(
            adminUser?.Id,
            adminUser?.Role.ToString() ?? "Admin",
            "Products",
            "PATCH",
            new
            {
                action = "ToggleProductActive",
                productId = id,
                productName = product.Name,
                changes = new { isActive = new { from = !product.IsActive, to = product.IsActive } },
                before = new { isActive = !product.IsActive },
                after = new { isActive = product.IsActive }
            });

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

        var prodName = product.Name;
        var prodCategory = product.Category;

        _context.Products.Remove(product);
        await _context.SaveChangesAsync();

        var (auth, adminUser) = await GetAdminUserAsync();
        await LogAdminActionAsync(
            adminUser?.Id,
            adminUser?.Role.ToString() ?? "Admin",
            "Products",
            "DELETE",
            new
            {
                action = "DeleteProduct",
                productId = id,
                productName = prodName,
                category = prodCategory
            });

        return Ok(new { message = "Product deleted successfully." });
    }

    [HttpGet("newsletter/stats")]
    public async Task<IActionResult> GetNewsletterStats()
    {
        if (!await IsFullAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Super Admin and Admin roles can access newsletter statistics." });

        var totalSubscribers = await _context.UserSessions
            .AsNoTracking()
            .CountAsync(s => s.Subscribe);

        var newsletterLogs = await _context.AdminLogs
            .AsNoTracking()
            .Where(l => l.Page == "Newsletter" && l.Type == "POST")
            .ToListAsync();

        var totalCampaigns = newsletterLogs.Count;
        var totalDelivered = 0;
        foreach (var l in newsletterLogs)
        {
            try
            {
                using var doc = JsonDocument.Parse(l.Description);
                if (doc.RootElement.TryGetProperty("successCount", out var sc) && sc.TryGetInt32(out var count))
                {
                    totalDelivered += count;
                }
            }
            catch { }
        }

        var lastBroadcast = newsletterLogs
            .OrderByDescending(l => l.CreatedAt)
            .Select(l => (DateTime?)l.CreatedAt)
            .FirstOrDefault();

        return Ok(new
        {
            totalSubscribers,
            totalCampaigns,
            totalDelivered,
            lastBroadcast
        });
    }

    [HttpGet("newsletter/subscribers")]
    public async Task<IActionResult> GetNewsletterSubscribers()
    {
        if (!await IsFullAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Super Admin and Admin roles can view subscribers." });

        var subscribedUsers = await _context.Users
            .Include(u => u.Session)
            .Where(u => u.Session != null && u.Session.Subscribe)
            .AsNoTracking()
            .ToListAsync();

        var result = subscribedUsers.Select(u => new
        {
            id = u.Id,
            email = u.Email,
            name = u.Name,
            role = u.Role == UserRole.SuperAdmin ? "Super Admin" : (u.Role == UserRole.LeadStaff ? "Lead Staff" : u.Role.ToString()),
            isActive = u.Session?.IsActive ?? true,
            subscribe = u.Session?.Subscribe ?? false
        }).ToList();

        return Ok(result);
    }

    [HttpGet("newsletter/history")]
    public async Task<IActionResult> GetNewsletterHistory()
    {
        if (!await IsFullAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Super Admin and Admin roles can view newsletter history." });

        var logs = await _context.AdminLogs
            .Include(l => l.User)
            .AsNoTracking()
            .Where(l => l.Page == "Newsletter" && l.Type == "POST")
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

        var result = logs.Select(l =>
        {
            string subject = "";
            string? preheader = null;
            string? badge = null;
            string? heading = null;
            string? bodyHtml = null;
            string? buttonText = null;
            string? buttonUrl = null;
            string senderName = "Rednest";
            string senderEmail = "noreply@rednest.com";
            int recipientCount = 0;
            int successCount = 0;
            int failedCount = 0;
            string status = "Sent";
            string? errorMessage = null;

            try
            {
                using var doc = JsonDocument.Parse(l.Description);
                var root = doc.RootElement;
                if (root.TryGetProperty("subject", out var pSubject)) subject = pSubject.GetString() ?? "";
                if (root.TryGetProperty("preheader", out var pPreheader)) preheader = pPreheader.GetString();
                if (root.TryGetProperty("badge", out var pBadge)) badge = pBadge.GetString();
                if (root.TryGetProperty("heading", out var pHeading)) heading = pHeading.GetString();
                if (root.TryGetProperty("bodyHtml", out var pBodyHtml)) bodyHtml = pBodyHtml.GetString();
                if (root.TryGetProperty("buttonText", out var pBtnText)) buttonText = pBtnText.GetString();
                if (root.TryGetProperty("buttonUrl", out var pBtnUrl)) buttonUrl = pBtnUrl.GetString();
                if (root.TryGetProperty("senderName", out var pSenderName)) senderName = pSenderName.GetString() ?? "Rednest";
                if (root.TryGetProperty("senderEmail", out var pSenderEmail)) senderEmail = pSenderEmail.GetString() ?? "noreply@rednest.com";
                if (root.TryGetProperty("recipientCount", out var pRc) && pRc.TryGetInt32(out var rc)) recipientCount = rc;
                if (root.TryGetProperty("successCount", out var pSc) && pSc.TryGetInt32(out var sc)) successCount = sc;
                if (root.TryGetProperty("failedCount", out var pFc) && pFc.TryGetInt32(out var fc)) failedCount = fc;
                if (root.TryGetProperty("status", out var pSt)) status = pSt.GetString() ?? "Sent";
                if (root.TryGetProperty("errorMessage", out var pErr)) errorMessage = pErr.GetString();
            }
            catch { }

            return new
            {
                id = l.Id,
                subject,
                preheader,
                badge,
                heading,
                contentHtml = bodyHtml,
                plainText = bodyHtml,
                buttonText,
                buttonUrl,
                senderName,
                senderEmail,
                sentByAdminId = l.UserId,
                sentByAdminName = l.User?.Name ?? l.User?.Email ?? "Admin",
                recipientCount,
                successCount,
                failedCount,
                status,
                errorMessage,
                createdAt = l.CreatedAt
            };
        }).ToList();

        return Ok(result);
    }

    [HttpGet("newsletter/history/{id:guid}")]
    public async Task<IActionResult> GetNewsletterHistoryById(Guid id)
    {
        if (!await IsFullAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Super Admin and Admin roles can view newsletter details." });

        var l = await _context.AdminLogs
            .Include(x => x.User)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && x.Page == "Newsletter");

        if (l == null)
            return NotFound(new { message = "Newsletter history record not found." });

        string subject = "";
        string? preheader = null;
        string? badge = null;
        string? heading = null;
        string? bodyHtml = null;
        string? buttonText = null;
        string? buttonUrl = null;
        string senderName = "Rednest";
        string senderEmail = "noreply@rednest.com";
        int recipientCount = 0;
        int successCount = 0;
        int failedCount = 0;
        string status = "Sent";
        string? errorMessage = null;

        try
        {
            using var doc = JsonDocument.Parse(l.Description);
            var root = doc.RootElement;
            if (root.TryGetProperty("subject", out var pSubject)) subject = pSubject.GetString() ?? "";
            if (root.TryGetProperty("preheader", out var pPreheader)) preheader = pPreheader.GetString();
            if (root.TryGetProperty("badge", out var pBadge)) badge = pBadge.GetString();
            if (root.TryGetProperty("heading", out var pHeading)) heading = pHeading.GetString();
            if (root.TryGetProperty("bodyHtml", out var pBodyHtml)) bodyHtml = pBodyHtml.GetString();
            if (root.TryGetProperty("buttonText", out var pBtnText)) buttonText = pBtnText.GetString();
            if (root.TryGetProperty("buttonUrl", out var pBtnUrl)) buttonUrl = pBtnUrl.GetString();
            if (root.TryGetProperty("senderName", out var pSenderName)) senderName = pSenderName.GetString() ?? "Rednest";
            if (root.TryGetProperty("senderEmail", out var pSenderEmail)) senderEmail = pSenderEmail.GetString() ?? "noreply@rednest.com";
            if (root.TryGetProperty("recipientCount", out var pRc) && pRc.TryGetInt32(out var rc)) recipientCount = rc;
            if (root.TryGetProperty("successCount", out var pSc) && pSc.TryGetInt32(out var sc)) successCount = sc;
            if (root.TryGetProperty("failedCount", out var pFc) && pFc.TryGetInt32(out var fc)) failedCount = fc;
            if (root.TryGetProperty("status", out var pSt)) status = pSt.GetString() ?? "Sent";
            if (root.TryGetProperty("errorMessage", out var pErr)) errorMessage = pErr.GetString();
        }
        catch { }

        return Ok(new
        {
            id = l.Id,
            subject,
            preheader,
            badge,
            heading,
            contentHtml = bodyHtml,
            plainText = bodyHtml,
            buttonText,
            buttonUrl,
            senderName,
            senderEmail,
            sentByAdminId = l.UserId,
            sentByAdminName = l.User?.Name ?? l.User?.Email ?? "Admin",
            recipientCount,
            successCount,
            failedCount,
            status,
            errorMessage,
            createdAt = l.CreatedAt
        });
    }

    [HttpPost("newsletter/send-test")]
    public async Task<IActionResult> SendNewsletterTest([FromBody] AdminSendTestEmailRequest request)
    {
        if (!await IsFullAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Super Admin and Admin roles can send test emails." });

        if (string.IsNullOrWhiteSpace(request.ToEmail))
            return BadRequest(new { message = "Recipient test email address is required." });

        if (string.IsNullOrWhiteSpace(request.Subject))
            return BadRequest(new { message = "Email subject is required." });

        if (string.IsNullOrWhiteSpace(request.BodyHtml))
            return BadRequest(new { message = "Email body content is required." });

        var (auth, adminUser) = await GetAdminUserAsync();
        var targetUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email.ToLower() == request.ToEmail.Trim().ToLower());
        var recipientName = targetUser?.Name ?? (!string.IsNullOrWhiteSpace(adminUser?.Name) ? adminUser.Name : "Valued Member");
        var year = DateTime.UtcNow.Year.ToString();

        var processedSubject = System.Text.RegularExpressions.Regex.Replace(request.Subject.Trim(), @"\{name\}", recipientName, System.Text.RegularExpressions.RegexOptions.IgnoreCase)
            .Replace("{email}", request.ToEmail.Trim(), StringComparison.OrdinalIgnoreCase)
            .Replace("{year}", year, StringComparison.OrdinalIgnoreCase);

        var htmlContent = _emailService.BuildNewsletterHtml(
            subject: request.Subject.Trim(),
            preheader: request.Preheader?.Trim(),
            badge: request.Badge?.Trim(),
            heading: request.Heading?.Trim(),
            bodyHtml: request.BodyHtml.Trim(),
            buttonText: request.ButtonText?.Trim(),
            buttonUrl: request.ButtonUrl?.Trim(),
            recipientName: recipientName,
            recipientEmail: request.ToEmail.Trim()
        );

        try
        {
            await _emailService.SendNewsletterEmailAsync(
                toEmail: request.ToEmail.Trim(),
                subject: processedSubject,
                htmlContent: htmlContent,
                senderName: request.SenderName?.Trim()
            );

            await LogAdminActionAsync(
                adminUser?.Id,
                adminUser?.Role.ToString() ?? "Admin",
                "Newsletter",
                "POST",
                new
                {
                    action = "SendNewsletterTest",
                    toEmail = request.ToEmail.Trim(),
                    subject = request.Subject.Trim(),
                    preheader = request.Preheader?.Trim(),
                    badge = request.Badge?.Trim(),
                    heading = request.Heading?.Trim(),
                    bodyHtml = request.BodyHtml.Trim(),
                    buttonText = request.ButtonText?.Trim(),
                    buttonUrl = request.ButtonUrl?.Trim(),
                    senderName = request.SenderName?.Trim()
                });

            return Ok(new { message = $"Test newsletter sent successfully to {request.ToEmail.Trim()}." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Failed to send test email: {ex.Message}" });
        }
    }

    [HttpPost("newsletter/broadcast")]
    public async Task<IActionResult> BroadcastNewsletter([FromBody] AdminSendNewsletterRequest request)
    {
        if (!await IsFullAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Super Admin and Admin roles can broadcast newsletter campaigns." });

        if (string.IsNullOrWhiteSpace(request.Subject))
            return BadRequest(new { message = "Email subject is required." });

        if (string.IsNullOrWhiteSpace(request.BodyHtml))
            return BadRequest(new { message = "Email body content is required." });

        var (auth, adminUser) = await GetAdminUserAsync();
        if (!auth || adminUser == null)
            return Unauthorized(new { message = "Admin session expired or invalid." });

        var subscribers = await _context.Users
            .Include(u => u.Session)
            .Where(u => u.Session != null && u.Session.Subscribe)
            .AsNoTracking()
            .ToListAsync();

        if (subscribers.Count == 0)
        {
            return BadRequest(new { message = "No active subscribed users found in the system." });
        }

        var senderName = !string.IsNullOrWhiteSpace(request.SenderName) ? request.SenderName.Trim() : "Rednest";
        var senderEmail = Environment.GetEnvironmentVariable("BREVO_SENDER_EMAIL") ?? "myrednest@gmail.com";

        var successCount = 0;
        var failedCount = 0;
        var errorMessages = new List<string>();

        foreach (var sub in subscribers)
        {
            try
            {
                var subName = !string.IsNullOrWhiteSpace(sub.Name) ? sub.Name.Trim() : "Valued Member";
                var personalSubject = System.Text.RegularExpressions.Regex.Replace(request.Subject.Trim(), @"\{name\}", subName, System.Text.RegularExpressions.RegexOptions.IgnoreCase)
                    .Replace("{email}", sub.Email.Trim(), StringComparison.OrdinalIgnoreCase)
                    .Replace("{year}", DateTime.UtcNow.Year.ToString(), StringComparison.OrdinalIgnoreCase);

                var personalHtml = _emailService.BuildNewsletterHtml(
                    subject: request.Subject.Trim(),
                    preheader: request.Preheader?.Trim(),
                    badge: request.Badge?.Trim(),
                    heading: request.Heading?.Trim(),
                    bodyHtml: request.BodyHtml.Trim(),
                    buttonText: request.ButtonText?.Trim(),
                    buttonUrl: request.ButtonUrl?.Trim(),
                    recipientName: sub.Name,
                    recipientEmail: sub.Email
                );

                await _emailService.SendNewsletterEmailAsync(
                    toEmail: sub.Email,
                    subject: personalSubject,
                    htmlContent: personalHtml,
                    senderName: senderName
                );
                successCount++;
            }
            catch (Exception ex)
            {
                failedCount++;
                if (errorMessages.Count < 5)
                {
                    errorMessages.Add($"{sub.Email}: {ex.Message}");
                }
            }
        }

        var status = failedCount == 0 ? "Sent" : (successCount > 0 ? "PartiallySent" : "Failed");
        var logId = Guid.NewGuid();

        await LogAdminActionAsync(
            adminUser?.Id,
            adminUser?.Role.ToString() ?? "Admin",
            "Newsletter",
            "POST",
            new
            {
                action = "BroadcastNewsletter",
                subject = request.Subject.Trim(),
                preheader = request.Preheader?.Trim(),
                badge = request.Badge?.Trim(),
                heading = request.Heading?.Trim(),
                bodyHtml = request.BodyHtml.Trim(),
                buttonText = request.ButtonText?.Trim(),
                buttonUrl = request.ButtonUrl?.Trim(),
                senderName = senderName,
                senderEmail = senderEmail,
                sentByAdminId = adminUser.Id,
                sentByAdminName = adminUser.Name ?? adminUser.Email,
                recipientCount = subscribers.Count,
                successCount = successCount,
                failedCount = failedCount,
                status = status,
                errorMessage = errorMessages.Count > 0 ? string.Join("; ", errorMessages) : null,
                recipientEmails = subscribers.Select(s => s.Email).ToList()
            });

        return Ok(new
        {
            message = $"Newsletter broadcast complete. Sent to {successCount} of {subscribers.Count} subscribers.",
            id = logId,
            recipientCount = subscribers.Count,
            successCount,
            failedCount,
            status = status
        });
    }

    [HttpDelete("newsletter/history/{id:guid}")]
    public async Task<IActionResult> DeleteNewsletterHistory(Guid id)
    {
        if (!await IsFullAdminAuthenticatedAsync())
            return StatusCode(403, new { message = "Access denied. Only Super Admin and Admin roles can delete newsletter history." });

        var log = await _context.AdminLogs.FirstOrDefaultAsync(l => l.Id == id && l.Page == "Newsletter");
        if (log == null)
            return NotFound(new { message = "Newsletter history record not found." });

        _context.AdminLogs.Remove(log);
        await _context.SaveChangesAsync();

        var (auth, adminUser) = await GetAdminUserAsync();
        await LogAdminActionAsync(
            adminUser?.Id,
            adminUser?.Role.ToString() ?? "Admin",
            "Newsletter",
            "DELETE",
            new
            {
                action = "DeleteNewsletterHistory",
                targetLogId = id
            });

        return Ok(new { message = "Newsletter history record deleted successfully." });
    }

    [HttpGet("logs")]
    public async Task<IActionResult> GetAdminLogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? search = null,
        [FromQuery] string? filterPage = null,
        [FromQuery] string? filterType = null,
        [FromQuery] string? filterRole = null)
    {
        if (!await IsAdminAuthenticatedAsync())
            return Unauthorized();

        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 200) pageSize = 25;

        try
        {
            var query = _context.AdminLogs
                .Include(l => l.User)
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(filterPage) && !filterPage.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                var p = filterPage.Trim();
                query = query.Where(l => EF.Functions.ILike(l.Page, p));
            }

            if (!string.IsNullOrWhiteSpace(filterType) && !filterType.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                var t = filterType.Trim();
                query = query.Where(l => EF.Functions.ILike(l.Type, t));
            }

            if (!string.IsNullOrWhiteSpace(filterRole) && !filterRole.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                var rClean = filterRole.Trim().Replace(" ", "");
                query = query.Where(l => l.Role.Replace(" ", "").ToLower() == rClean.ToLower());
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                var isGuid = Guid.TryParse(s, out var searchGuid);

                query = query.Where(l =>
                    (isGuid && (l.Id == searchGuid || l.UserId == searchGuid)) ||
                    EF.Functions.ILike(l.Page, $"%{s}%") ||
                    EF.Functions.ILike(l.Role, $"%{s}%") ||
                    EF.Functions.ILike(l.Type, $"%{s}%") ||
                    EF.Functions.ILike(l.Description, $"%{s}%") ||
                    (l.User != null && (
                        (l.User.Name != null && EF.Functions.ILike(l.User.Name, $"%{s}%")) ||
                        EF.Functions.ILike(l.User.Email, $"%{s}%")
                    )));
            }

            var totalCount = await query.CountAsync();

            var logs = await query
                .OrderByDescending(l => l.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(l => new
                {
                    id = l.Id,
                    userId = l.UserId,
                    role = l.Role == "SuperAdmin" ? "Super Admin" : l.Role,
                    page = l.Page,
                    type = l.Type,
                    description = l.Description,
                    createdAt = l.CreatedAt,
                    user = l.User != null ? new
                    {
                        id = l.User.Id,
                        name = l.User.Name,
                        email = l.User.Email,
                        profilePictureUrl = l.User.ProfilePictureUrl
                    } : null
                })
                .ToListAsync();

            return Ok(new
            {
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
                logs
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AdminLogs Error] {ex.Message}");
            return StatusCode(500, new { message = "Error querying admin logs", error = ex.Message });
        }
    }

    private async Task LogAdminActionAsync(
        Guid? userId,
        string role,
        string page,
        string type,
        object description)
    {
        try
        {
            var roleFormatted = role == "SuperAdmin" ? "Super Admin" : role;
            var log = new AdminLog
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Role = roleFormatted,
                Page = page,
                Type = type,
                Description = JsonSerializer.Serialize(description),
                CreatedAt = DateTime.UtcNow.AddHours(4)
            };
            _context.AdminLogs.Add(log);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AdminLog Warning] Could not save log: {ex.Message}");
        }
    }


    private static bool IsAllowedAdminRole(UserRole role)
    {
        return role == UserRole.Moderator || role == UserRole.Admin || role == UserRole.SuperAdmin;
    }

    private static bool IsFullAdminRole(UserRole role)
    {
        return role == UserRole.Admin || role == UserRole.SuperAdmin;
    }

    private static int GetUserRoleLevel(UserRole role) => role switch
    {
        UserRole.SuperAdmin => 6,
        UserRole.Admin => 5,
        UserRole.Moderator => 4,
        UserRole.Support => 3,
        UserRole.LeadStaff => 2,
        UserRole.Staff => 1,
        UserRole.Bot => 0,
        UserRole.AI => 0,
        UserRole.Customer => 0,
        _ => 0
    };

    private static bool IsSuperAdminRole(UserRole role)
    {
        return role == UserRole.SuperAdmin;
    }

    private async Task<(bool Authenticated, User? User)> GetAdminUserAsync()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            return (false, null);

        var adminSessionToken = Request.Cookies["admin_session"];
        if (string.IsNullOrEmpty(adminSessionToken) || !ValidateSignedAdminToken(adminSessionToken, userIdStr))
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

    [HttpPut("footer")]
    public async Task<IActionResult> UpdateFooter([FromBody] FooterUpdateRequest request)
    {
        var (auth, adminUser) = await GetAdminUserAsync();
        if (!auth)
            return Unauthorized(new { message = "Unauthorized." });

        if (request == null || request.FooterRU == null || request.FooterEN == null || request.FooterAZ == null)
            return BadRequest(new { message = "Invalid footer data." });

        var ruJson = System.Text.Json.JsonSerializer.Serialize(request.FooterRU);
        var enJson = System.Text.Json.JsonSerializer.Serialize(request.FooterEN);
        var azJson = System.Text.Json.JsonSerializer.Serialize(request.FooterAZ);

        var affected = await _context.Database.ExecuteSqlRawAsync(
            @"UPDATE ""Footer"" 
              SET ""UpdatedAt"" = NOW(), 
                  ""FooterRU"" = {0}::jsonb, 
                  ""FooterEN"" = {1}::jsonb, 
                  ""FooterAZ"" = {2}::jsonb",
            ruJson, enJson, azJson);

        if (affected == 0)
        {
            await _context.Database.ExecuteSqlRawAsync(
                @"INSERT INTO ""Footer"" (""UpdatedAt"", ""FooterRU"", ""FooterEN"", ""FooterAZ"") 
                  VALUES (NOW(), {0}::jsonb, {1}::jsonb, {2}::jsonb)",
                ruJson, enJson, azJson);
        }

        await LogAdminActionAsync(
            adminUser?.Id,
            adminUser?.Role.ToString() ?? "Admin",
            "Footer",
            "PUT",
            new
            {
                action = "UpdateFooter",
                target = "Website Footer (RU/EN/AZ)"
            });

        return Ok(new { message = "Footer updated successfully." });
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

public class FooterUpdateRequest
{
    public FooterLanguageContent FooterRU { get; set; } = new();
    public FooterLanguageContent FooterEN { get; set; } = new();
    public FooterLanguageContent FooterAZ { get; set; } = new();
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

public class AdminProductTranslationsRequest
{
    public string? EN { get; set; }
    public string? RU { get; set; }
    public string? AZ { get; set; }
}

public class AdminProductRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public AdminProductTranslationsRequest? NameTranslations { get; set; }
    public AdminProductTranslationsRequest? DescriptionTranslations { get; set; }
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

public class AdminSendNewsletterRequest
{
    public string Subject { get; set; } = string.Empty;
    public string? Preheader { get; set; }
    public string? Badge { get; set; }
    public string? Heading { get; set; }
    public string BodyHtml { get; set; } = string.Empty;
    public string? ButtonText { get; set; }
    public string? ButtonUrl { get; set; }
    public string? SenderName { get; set; }
}

public class AdminSendTestEmailRequest
{
    public string ToEmail { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string? Preheader { get; set; }
    public string? Badge { get; set; }
    public string? Heading { get; set; }
    public string BodyHtml { get; set; } = string.Empty;
    public string? ButtonText { get; set; }
    public string? ButtonUrl { get; set; }
    public string? SenderName { get; set; }
}
