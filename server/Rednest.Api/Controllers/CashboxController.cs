namespace Rednest.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CashboxController : ControllerBase
{
    private readonly AppDbContext _context;

    public CashboxController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("init")]
    [HttpGet("products")]
    public async Task<IActionResult> GetInitData([FromQuery] string? lang = "en")
    {
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

        var cashierName = "Anna K.";
        string? cashierAvatar = null;

        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(userIdStr, out var userId))
        {
            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
            if (user != null)
            {
                cashierName = !string.IsNullOrWhiteSpace(user.Name) ? user.Name : (user.Email ?? "Cashier");
                cashierAvatar = user.ProfilePictureUrl;
            }
        }

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
        if (request == null || request.Products == null || request.Products.Count == 0)
        {
            return BadRequest(new { message = "Order must contain at least one item." });
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
                PromoCodeId = request.PromoCodeId,
                TotalAmount = request.TotalAmount
            },
            CreatedAt = DateTime.UtcNow
        };

        _context.Cashboxes.Add(cashboxRecord);
        await _context.SaveChangesAsync();

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
