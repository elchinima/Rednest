namespace Rednest.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class CashboxController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAnalyticsTrackingService _analyticsTrackingService;

    public CashboxController(AppDbContext context, IAnalyticsTrackingService analyticsTrackingService)
    {
        _context = context;
        _analyticsTrackingService = analyticsTrackingService;
    }

    private static bool IsAllowedCashboxRole(UserRole role)
    {
        return role == UserRole.Staff || role == UserRole.Admin || role == UserRole.SuperAdmin;
    }

    private async Task<(bool Allowed, User? User, IActionResult? ErrorResult)> ValidateCashboxAccessAsync()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
        {
            return (false, null, Unauthorized(new { message = "Authentication required." }));
        }

        var user = await _context.Users
            .Include(u => u.Session)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            return (false, null, Unauthorized(new { message = "User not found." }));
        }

        if (user.Session != null && !user.Session.IsActive)
        {
            return (false, null, Unauthorized(new { message = "Account suspended." }));
        }

        if (!IsAllowedCashboxRole(user.Role))
        {
            return (false, null, StatusCode(StatusCodes.Status403Forbidden, new { message = "Access denied. Cashbox access is restricted to Staff, Admin, and Super Admin." }));
        }

        return (true, user, null);
    }

    [HttpGet("init")]
    [HttpGet("products")]
    public async Task<IActionResult> GetInitData([FromQuery] string? lang = "en")
    {
        var (allowed, cashierUser, errorResult) = await ValidateCashboxAccessAsync();
        if (!allowed || cashierUser == null)
        {
            return errorResult!;
        }
        var normalizedLang = (lang ?? "en").Trim().ToLowerInvariant();

        var products = await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .ToListAsync();

        var productList = products.Select(p =>
        {
            var name = normalizedLang switch
            {
                "az" => !string.IsNullOrEmpty(p.Name.AZ) ? p.Name.AZ : (!string.IsNullOrEmpty(p.Name.EN) ? p.Name.EN : p.Name.RU),
                "ru" => !string.IsNullOrEmpty(p.Name.RU) ? p.Name.RU : (!string.IsNullOrEmpty(p.Name.EN) ? p.Name.EN : p.Name.AZ),
                _ => !string.IsNullOrEmpty(p.Name.EN) ? p.Name.EN : (!string.IsNullOrEmpty(p.Name.AZ) ? p.Name.AZ : p.Name.RU),
            };

            var desc = normalizedLang switch
            {
                "az" => !string.IsNullOrEmpty(p.Description.AZ) ? p.Description.AZ : (!string.IsNullOrEmpty(p.Description.EN) ? p.Description.EN : p.Description.RU),
                "ru" => !string.IsNullOrEmpty(p.Description.RU) ? p.Description.RU : (!string.IsNullOrEmpty(p.Description.EN) ? p.Description.EN : p.Description.AZ),
                _ => !string.IsNullOrEmpty(p.Description.EN) ? p.Description.EN : (!string.IsNullOrEmpty(p.Description.AZ) ? p.Description.AZ : p.Description.RU),
            };

            var price = p.Prices != null ? (p.Prices.DiscountPrice ?? p.Prices.Price) : 0m;
            var img = !string.IsNullOrEmpty(p.Images?.Icon) ? p.Images.Icon : (p.Images?.Image ?? string.Empty);

            return new
            {
                id = p.Id,
                name = name,
                displayName = name,
                description = desc,
                displayDescription = desc,
                category = !string.IsNullOrWhiteSpace(p.Category) ? p.Category.Trim() : "General",
                price = price,
                originalPrice = p.Prices?.Price ?? price,
                discountPrice = p.Prices?.DiscountPrice,
                imageUrl = img,
                iconUrl = img,
                image = img
            };
        }).ToList();

        var predefinedOrder = new List<string> { "All", "Main Drinks", "Specialty Drinks", "Desserts" };
        var foundCategories = productList.Select(p => p.category).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var allCategories = new List<string> { "All" };
        foreach (var cat in predefinedOrder.Skip(1))
        {
            if (foundCategories.Any(c => string.Equals(c, cat, StringComparison.OrdinalIgnoreCase)) && !allCategories.Contains(cat))
            {
                allCategories.Add(cat);
            }
        }
        foreach (var cat in foundCategories)
        {
            if (!allCategories.Any(c => string.Equals(c, cat, StringComparison.OrdinalIgnoreCase)))
            {
                allCategories.Add(cat);
            }
        }

        var cashierName = !string.IsNullOrWhiteSpace(cashierUser.Name) ? cashierUser.Name : (cashierUser.Email ?? "Cashier");
        var cashierAvatar = cashierUser.ProfilePictureUrl;

        return Ok(new
        {
            products = productList,
            categories = allCategories,
            cashier = new
            {
                name = cashierName,
                avatar = cashierAvatar
            }
        });
    }

    [HttpGet("promos/search")]
    public async Task<IActionResult> SearchPromos([FromQuery] string? query)
    {
        var (allowed, _, errorResult) = await ValidateCashboxAccessAsync();
        if (!allowed)
        {
            return errorResult!;
        }

        if (string.IsNullOrWhiteSpace(query))
        {
            return Ok(new List<object>());
        }

        var q = query.Trim();
        var qUpper = q.ToUpperInvariant();

        var now = DateTime.UtcNow;

        var promos = await _context.UserPromos
            .Include(p => p.User)
            .AsNoTracking()
            .Where(p => p.IsActive && p.Dates.ExpiresAt >= now && (p.Codes.BarCode.Contains(q) || p.Codes.PromoCode.ToUpper().Contains(qUpper)))
            .OrderByDescending(p => p.Dates.ActivatedAt)
            .Take(25)
            .ToListAsync();

        var pixel = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == "myrednest@gmail.com");

        var results = promos.Select(p =>
        {
            var isUnclaimed = pixel != null && p.UserId == pixel.Id;
            var isExpired = p.Dates.ExpiresAt < now;
            var status = !p.IsActive ? "Inactive" : (isExpired ? "Expired" : "Active");

            var ownerName = isUnclaimed
                ? "Unclaimed (Public Promo)"
                : (!string.IsNullOrWhiteSpace(p.User?.Name) ? p.User.Name : (p.User?.Email ?? "Anonymous Customer"));

            return new
            {
                id = p.Id,
                promoCode = p.Codes.PromoCode,
                barCode = p.Codes.BarCode,
                prizeName = !string.IsNullOrWhiteSpace(p.PrizeInfo?.PrizeName) ? p.PrizeInfo.PrizeName : "Promo Discount",
                prizeDescription = p.PrizeInfo?.PrizeDescription ?? string.Empty,
                prizeType = p.PrizeInfo?.Type.ToString() ?? "DiscountCustom",
                discountPercent = p.PrizeInfo?.DiscountPercent ?? 0,
                cashbackPercent = p.PrizeInfo?.CashbackPercent ?? 0,
                isActive = p.IsActive,
                isExpired = isExpired,
                status = status,
                activatedAt = p.Dates.ActivatedAt,
                expiresAt = p.Dates.ExpiresAt,
                isClaimed = !isUnclaimed,
                userName = ownerName,
                userEmail = isUnclaimed ? null : p.User?.Email,
                userAvatar = isUnclaimed ? null : p.User?.ProfilePictureUrl
            };
        }).ToList();

        return Ok(results);
    }

    [HttpPost("orders")]
    public async Task<IActionResult> CreateCashboxOrder([FromBody] CashboxOrderRequest request)
    {
        var (allowed, _, errorResult) = await ValidateCashboxAccessAsync();
        if (!allowed)
        {
            return errorResult!;
        }
        if (request == null || request.Products == null || request.Products.Count == 0)
        {
            return BadRequest(new { message = "Order must contain at least one item." });
        }

        Rednest.Core.Entities.UserPromo? promo = null;
        if (!string.IsNullOrWhiteSpace(request.PromoCodeId))
        {
            var rawCode = request.PromoCodeId.Trim();
            var codeUpper = rawCode.ToUpperInvariant();

            if (Guid.TryParse(rawCode, out var promoGuid))
            {
                promo = await _context.UserPromos.FirstOrDefaultAsync(p => p.Id == promoGuid);
            }

            if (promo == null)
            {
                promo = await _context.UserPromos.FirstOrDefaultAsync(p =>
                    p.Codes.PromoCode.ToUpper() == codeUpper || p.Codes.BarCode == rawCode);
            }

            if (promo == null)
            {
                return BadRequest(new { message = "Promo code not found." });
            }

            if (!promo.IsActive || promo.Dates.ExpiresAt < DateTime.UtcNow)
            {
                return BadRequest(new { message = "Promo code is expired or has already been used." });
            }

            promo.IsActive = false;
            _context.UserPromos.Update(promo);
        }

        var cashboxRecord = new Rednest.Core.Entities.Cashbox
        {
            PayMethod = string.Equals(request.PayMethod, "Card", StringComparison.OrdinalIgnoreCase)
                ? CashboxPayMethod.Card
                : CashboxPayMethod.Cash,
            Products = request.Products.Select(p => new CashboxProductItem
            {
                ProductId = p.ProductId,
                Quantity = p.Quantity
            }).ToList(),
            Paid = new CashboxPaidDetails
            {
                InitialAmount = request.InitialAmount,
                PromoCodeId = promo?.Codes.PromoCode ?? request.PromoCodeId,
                TotalAmount = request.TotalAmount
            },
            CreatedAt = DateTime.UtcNow
        };

        _context.Cashboxes.Add(cashboxRecord);
        await _context.SaveChangesAsync();

        _ = Task.Run(() => _analyticsTrackingService.TrackAnalyticsAsync());

        return Ok(new { success = true, orderId = cashboxRecord.Id });
    }
}

public class CashboxOrderRequest
{
    public string PayMethod { get; set; } = "Cash";
    public List<CashboxProductItemRequest> Products { get; set; } = new();
    public decimal InitialAmount { get; set; }
    public string? PromoCodeId { get; set; }
    public decimal TotalAmount { get; set; }
}

public class CashboxProductItemRequest
{
    public Guid ProductId { get; set; }
    public int Quantity { get; set; } = 1;
}
