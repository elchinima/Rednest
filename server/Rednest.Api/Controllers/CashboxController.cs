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
        return role == UserRole.Staff || role == UserRole.LeadStaff || role == UserRole.Admin || role == UserRole.SuperAdmin;
    }

    private static bool IsAllowedCashboxHistoryRole(UserRole role)
    {
        return role == UserRole.LeadStaff || role == UserRole.Admin || role == UserRole.SuperAdmin;
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
            return (false, null, StatusCode(StatusCodes.Status403Forbidden, new { message = "Access denied. Cashbox access is restricted to Staff, Lead Staff, Admin, and Super Admin." }));
        }

        return (true, user, null);
    }

    private async Task<(bool Allowed, User? User, IActionResult? ErrorResult)> ValidateCashboxHistoryAccessAsync()
    {
        var (allowed, user, errorResult) = await ValidateCashboxAccessAsync();
        if (!allowed || user == null)
        {
            return (false, null, errorResult);
        }

        if (!IsAllowedCashboxHistoryRole(user.Role))
        {
            return (false, null, StatusCode(StatusCodes.Status403Forbidden, new { message = "Access denied. Cashbox history is restricted to Lead Staff, Admin, and Super Admin." }));
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
        var (allowed, cashierUser, errorResult) = await ValidateCashboxAccessAsync();
        if (!allowed || cashierUser == null)
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

        var status = CashboxStatus.Success;
        if (!string.IsNullOrWhiteSpace(request.Status) && Enum.TryParse<CashboxStatus>(request.Status.Trim(), true, out var parsedStatus))
        {
            status = parsedStatus;
        }

        var cashierName = !string.IsNullOrWhiteSpace(cashierUser.Name) ? cashierUser.Name : (cashierUser.Email ?? "Cashier");

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
            Status = status,
            Description = new CashboxDescription
            {
                Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
                Edited = null,
                CashierId = cashierUser.Id,
                CashierName = cashierName
            },
            CreatedAt = DateTime.UtcNow
        };

        _context.Cashboxes.Add(cashboxRecord);
        await _context.SaveChangesAsync();

        _ = Task.Run(() => _analyticsTrackingService.TrackAnalyticsAsync());

        return Ok(new { success = true, orderId = cashboxRecord.Id });
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetCashboxHistory(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? payMethod = null,
        [FromQuery] string? dateRange = null,
        [FromQuery] string? lang = "en")
    {
        var (allowed, _, errorResult) = await ValidateCashboxHistoryAccessAsync();
        if (!allowed)
        {
            return errorResult!;
        }

        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var normalizedLang = (lang ?? "en").Trim().ToLowerInvariant();

        var query = _context.Cashboxes.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
        {
            if (Enum.TryParse<CashboxStatus>(status.Trim(), true, out var parsedStatus))
            {
                query = query.Where(c => c.Status == parsedStatus);
            }
        }

        if (!string.IsNullOrWhiteSpace(payMethod) && !string.Equals(payMethod, "all", StringComparison.OrdinalIgnoreCase))
        {
            if (Enum.TryParse<CashboxPayMethod>(payMethod.Trim(), true, out var parsedPayMethod))
            {
                query = query.Where(c => c.PayMethod == parsedPayMethod);
            }
        }

        if (!string.IsNullOrWhiteSpace(dateRange))
        {
            var now = DateTime.UtcNow;
            if (string.Equals(dateRange, "today", StringComparison.OrdinalIgnoreCase))
            {
                var todayStart = now.Date;
                query = query.Where(c => c.CreatedAt >= todayStart);
            }
            else if (string.Equals(dateRange, "yesterday", StringComparison.OrdinalIgnoreCase))
            {
                var yesterdayStart = now.Date.AddDays(-1);
                var todayStart = now.Date;
                query = query.Where(c => c.CreatedAt >= yesterdayStart && c.CreatedAt < todayStart);
            }
            else if (string.Equals(dateRange, "week", StringComparison.OrdinalIgnoreCase))
            {
                var weekStart = now.Date.AddDays(-7);
                query = query.Where(c => c.CreatedAt >= weekStart);
            }
            else if (string.Equals(dateRange, "month", StringComparison.OrdinalIgnoreCase))
            {
                var monthStart = now.Date.AddDays(-30);
                query = query.Where(c => c.CreatedAt >= monthStart);
            }
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var sLower = search.Trim().ToLowerInvariant();
            query = query.Where(c =>
                c.Id.ToString().ToLower().Contains(sLower) ||
                (c.Paid.PromoCodeId != null && c.Paid.PromoCodeId.ToLower().Contains(sLower)) ||
                (c.Description.Note != null && c.Description.Note.ToLower().Contains(sLower)) ||
                (c.Description.CashierName != null && c.Description.CashierName.ToLower().Contains(sLower))
            );
        }

        var totalCount = await query.CountAsync();

        var allFiltered = await query.Select(c => new
        {
            c.Paid.TotalAmount,
            c.PayMethod,
            c.Status
        }).ToListAsync();

        var totalRevenue = allFiltered.Where(c => c.Status == CashboxStatus.Success).Sum(c => c.TotalAmount);
        var cashRevenue = allFiltered.Where(c => c.Status == CashboxStatus.Success && c.PayMethod == CashboxPayMethod.Cash).Sum(c => c.TotalAmount);
        var cardRevenue = allFiltered.Where(c => c.Status == CashboxStatus.Success && c.PayMethod == CashboxPayMethod.Card).Sum(c => c.TotalAmount);
        var successCount = allFiltered.Count(c => c.Status == CashboxStatus.Success);
        var refundedCount = allFiltered.Count(c => c.Status == CashboxStatus.Refunded);
        var cancelledCount = allFiltered.Count(c => c.Status == CashboxStatus.Cancelled);

        var pagedRecords = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var productIds = pagedRecords.SelectMany(c => c.Products).Select(p => p.ProductId).Distinct().ToList();
        var products = await _context.Products
            .AsNoTracking()
            .Where(p => productIds.Contains(p.Id))
            .ToListAsync();
        var productDict = products.ToDictionary(p => p.Id);

        var editorIds = pagedRecords
            .Where(c => c.Description?.Edited?.UserId != null && c.Description.Edited.UserId != Guid.Empty)
            .Select(c => c.Description.Edited!.UserId)
            .Distinct()
            .ToList();
        var editors = await _context.Users
            .AsNoTracking()
            .Where(u => editorIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.Name ?? u.Email);

        var orders = pagedRecords.Select(c =>
        {
            var editorName = (c.Description?.Edited?.UserId != null && editors.TryGetValue(c.Description.Edited.UserId, out var edName))
                ? edName
                : null;

            var items = c.Products.Select(pi =>
            {
                productDict.TryGetValue(pi.ProductId, out var prod);

                var name = normalizedLang switch
                {
                    "az" => !string.IsNullOrEmpty(prod?.Name.AZ) ? prod.Name.AZ : (!string.IsNullOrEmpty(prod?.Name.EN) ? prod.Name.EN : prod?.Name.RU ?? "Məhsul"),
                    "ru" => !string.IsNullOrEmpty(prod?.Name.RU) ? prod.Name.RU : (!string.IsNullOrEmpty(prod?.Name.EN) ? prod.Name.EN : prod?.Name.AZ ?? "Товар"),
                    _ => !string.IsNullOrEmpty(prod?.Name.EN) ? prod.Name.EN : (!string.IsNullOrEmpty(prod?.Name.AZ) ? prod.Name.AZ : prod?.Name.RU ?? "Product"),
                };

                return new
                {
                    productId = pi.ProductId,
                    quantity = pi.Quantity,
                    name = name,
                    nameAZ = prod?.Name.AZ,
                    nameRU = prod?.Name.RU,
                    nameEN = prod?.Name.EN,
                    price = prod?.Prices != null ? (prod.Prices.DiscountPrice ?? prod.Prices.Price) : 0m,
                    originalPrice = prod?.Prices?.Price ?? 0m,
                    discountPrice = prod?.Prices?.DiscountPrice,
                    imageUrl = !string.IsNullOrEmpty(prod?.Images?.Icon) ? prod.Images.Icon : prod?.Images?.Image,
                    category = prod?.Category ?? "General"
                };
            }).ToList();

            return new
            {
                id = c.Id,
                payMethod = c.PayMethod.ToString(),
                status = c.Status.ToString(),
                initialAmount = c.Paid.InitialAmount,
                promoCode = c.Paid.PromoCodeId,
                totalAmount = c.Paid.TotalAmount,
                discountAmount = Math.Max(0m, c.Paid.InitialAmount - c.Paid.TotalAmount),
                note = c.Description?.Note,
                cashierId = c.Description?.CashierId,
                cashierName = c.Description?.CashierName,
                editedBy = editorName,
                editedAt = c.Description?.Edited?.Date,
                createdAt = c.CreatedAt,
                itemCount = c.Products.Sum(p => p.Quantity),
                products = items
            };
        }).ToList();

        return Ok(new
        {
            orders,
            totalCount,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling((double)totalCount / pageSize),
            summary = new
            {
                totalRevenue,
                cashRevenue,
                cardRevenue,
                totalOrders = totalCount,
                successCount,
                refundedCount,
                cancelledCount
            }
        });
    }

    [HttpDelete("orders/{id:guid}")]
    public async Task<IActionResult> DeleteCashboxOrder(Guid id)
    {
        var (allowed, user, errorResult) = await ValidateCashboxHistoryAccessAsync();
        if (!allowed || user == null) return errorResult!;

        if (user.Role != UserRole.Admin && user.Role != UserRole.SuperAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only Admin and Super Admin can delete cashbox records." });
        }

        var record = await _context.Cashboxes.FirstOrDefaultAsync(c => c.Id == id);
        if (record == null) return NotFound(new { message = "Cashbox order not found." });

        _context.Cashboxes.Remove(record);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Cashbox order deleted successfully." });
    }

    [HttpPatch("orders/{id:guid}")]
    public async Task<IActionResult> UpdateCashboxOrder(Guid id, [FromBody] UpdateCashboxOrderRequest request)
    {
        var (allowed, cashierUser, errorResult) = await ValidateCashboxAccessAsync();
        if (!allowed || cashierUser == null)
        {
            return errorResult!;
        }

        var cashboxRecord = await _context.Cashboxes.FirstOrDefaultAsync(c => c.Id == id);
        if (cashboxRecord == null)
        {
            return NotFound(new { message = "Cashbox order not found." });
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            if (Enum.TryParse<CashboxStatus>(request.Status.Trim(), true, out var newStatus))
            {
                cashboxRecord.Status = newStatus;
            }
            else
            {
                return BadRequest(new { message = $"Invalid status. Allowed values: {string.Join(", ", Enum.GetNames<CashboxStatus>())}" });
            }
        }

        cashboxRecord.Description ??= new CashboxDescription();

        if (request.Note != null)
        {
            cashboxRecord.Description.Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        }

        cashboxRecord.Description.Edited = new CashboxEditedInfo
        {
            UserId = cashierUser.Id,
            Date = DateTime.UtcNow
        };

        await _context.SaveChangesAsync();

        return Ok(new { success = true, order = cashboxRecord });
    }
}

public class CashboxOrderRequest
{
    public string PayMethod { get; set; } = "Cash";
    public List<CashboxProductItemRequest> Products { get; set; } = new();
    public decimal InitialAmount { get; set; }
    public string? PromoCodeId { get; set; }
    public decimal TotalAmount { get; set; }
    public string? Status { get; set; }
    public string? Note { get; set; }
}

public class UpdateCashboxOrderRequest
{
    public string? Status { get; set; }
    public string? Note { get; set; }
}

public class CashboxProductItemRequest
{
    public Guid ProductId { get; set; }
    public int Quantity { get; set; } = 1;
}
