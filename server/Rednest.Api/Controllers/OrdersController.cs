using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rednest.Application.Interfaces;
using Rednest.Core.Entities;
using Rednest.Infrastructure.Data;
using Stripe;
using System.Security.Claims;
using CorePaymentMethod = Rednest.Core.Entities.PaymentMethod;

namespace Rednest.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly AppDbContext _context;

    public OrdersController(IUserRepository userRepository, AppDbContext context)
    {
        _userRepository = userRepository;
        _context = context;
    }

    private Guid? GetUserId()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
            return null;
        return userId;
    }

    private static DateTime GetBakuTime() => DateTime.UtcNow.AddHours(4);

    private async Task<OrderCalculationResult?> CalculateOrderAsync(Guid userId, UserBasket basket)
    {
        if (basket.Items == null || basket.Items.Count == 0) return null;

        var productIds = basket.Items.Select(i => i.ProductId).Distinct().ToList();
        var products = await _context.Products
            .Where(p => productIds.Contains(p.Id))
            .AsNoTracking()
            .ToListAsync();

        var enriched = basket.Items
            .Select(i => new
            {
                Item = i,
                Product = products.FirstOrDefault(p => p.Id == i.ProductId)
            })
            .Where(x => x.Product != null)
            .ToList();

        if (enriched.Count == 0) return null;

        decimal originalTotal = Math.Round(enriched.Sum(x => x.Product!.Price * x.Item.Quantity), 2);
        decimal discount = 0m;
        decimal cashbackAmount = 0m;
        int cashbackPercent = 0;
        string? appliedPromoCode = null;
        string? appliedPromoName = null;

        var promo = await _userRepository.GetActiveUserPromoAsync(userId);
        if (promo != null && promo.IsActive && promo.Dates.ExpiresAt >= DateTime.UtcNow)
        {
            switch (promo.PrizeInfo.Type)
            {
                case PrizeType.Discount25:
                    discount = Math.Round(originalTotal * 0.25m, 2);
                    break;

                case PrizeType.Discount50:
                    discount = Math.Round(originalTotal * 0.50m, 2);
                    break;

                case PrizeType.SuperPrize:
                    discount = Math.Min(originalTotal, 25.00m);
                    break;

                case PrizeType.FreeDrink:
                {
                    var drinkCategories = new[] { "Main Drinks", "Specialty Drinks" };
                    var drinks = enriched.Where(x => drinkCategories.Contains(x.Product!.Category) || 
                                                     x.Product.Category.Contains("Drink", StringComparison.OrdinalIgnoreCase)).ToList();
                    if (drinks.Count > 0)
                    {
                        var totalDrinkQty = drinks.Sum(x => x.Item.Quantity);
                        var totalDrinkPrice = drinks.Sum(x => x.Product!.Price * x.Item.Quantity);
                        var avgDrinkPrice = totalDrinkPrice / totalDrinkQty;
                        discount = Math.Round(avgDrinkPrice, 2);
                    }
                    break;
                }

                case PrizeType.FreeDessert:
                {
                    var desserts = enriched.Where(x => x.Product!.Category == "Desserts" ||
                                                       x.Product.Category.Contains("Dessert", StringComparison.OrdinalIgnoreCase)).ToList();
                    if (desserts.Count > 0)
                    {
                        var totalDessertQty = desserts.Sum(x => x.Item.Quantity);
                        var totalDessertPrice = desserts.Sum(x => x.Product!.Price * x.Item.Quantity);
                        var avgDessertPrice = totalDessertPrice / totalDessertQty;
                        discount = Math.Round(avgDessertPrice, 2);
                    }
                    break;
                }

                case PrizeType.CashbackOnPurchases:
                    discount = 0m;
                    cashbackPercent = promo.PrizeInfo.CashbackPercent > 0 ? promo.PrizeInfo.CashbackPercent : 10;
                    break;

                default:
                    discount = 0m;
                    break;
            }

            if (discount > 0)
            {
                discount = Math.Min(discount, originalTotal);
                appliedPromoCode = promo.Codes.PromoCode;
                appliedPromoName = promo.PrizeInfo.PrizeName;
            }
            else if (promo.PrizeInfo.Type == PrizeType.CashbackOnPurchases)
            {
                var payable = Math.Max(0m, Math.Round(originalTotal - discount, 2));
                cashbackAmount = Math.Round(payable * (cashbackPercent / 100m), 2);
                appliedPromoCode = promo.Codes.PromoCode;
                appliedPromoName = !string.IsNullOrEmpty(promo.PrizeInfo.PrizeName)
                    ? promo.PrizeInfo.PrizeName
                    : $"{cashbackPercent}% Cashback";
            }
        }

        decimal totalAmount = Math.Max(0m, Math.Round(originalTotal - discount, 2));

        var orderItems = enriched.Select(x => new OrderProductItem
        {
            ProductId = x.Product!.Id,
            Quantity = x.Item.Quantity,
            UnitPrice = x.Product.Price
        }).ToList();

        return new OrderCalculationResult
        {
            OriginalTotal = originalTotal,
            Discount = discount,
            TotalAmount = totalAmount,
            CashbackAmount = cashbackAmount,
            CashbackPercent = cashbackPercent,
            AppliedPromoCode = appliedPromoCode,
            AppliedPromoName = appliedPromoName,
            Promo = promo,
            OrderItems = orderItems
        };
    }

    [HttpGet("stripe/config")]
    [AllowAnonymous]
    public IActionResult GetStripeConfig()
    {
        var publishableKey = StripWhitespace(
            Environment.GetEnvironmentVariable("STRIPE_PUBLISHABLE_KEY")
            ?? Environment.GetEnvironmentVariable("VITE_STRIPE_PUBLISHABLE_KEY")
            ?? "");
        return Ok(new { publishableKey });
    }

    [HttpPost("stripe/create-intent")]
    public async Task<IActionResult> CreateStripePaymentIntent([FromBody] StripeIntentRequest? request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var stripeSecretKey = StripWhitespace(Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY") ?? "");
        if (string.IsNullOrEmpty(stripeSecretKey))
        {
            return StatusCode(500, new { message = "Stripe secret key is not configured on the server." });
        }

        var basket = await _userRepository.GetBasketByUserIdAsync(userId.Value);
        if (basket == null || basket.Items == null || basket.Items.Count == 0)
        {
            return BadRequest(new { message = "Basket is empty." });
        }

        var calc = await CalculateOrderAsync(userId.Value, basket);
        if (calc == null || calc.OrderItems.Count == 0)
        {
            return BadRequest(new { message = "Items from basket not found in catalog." });
        }

        if (calc.TotalAmount <= 0)
        {
            return BadRequest(new { message = "Total amount is 0. Please checkout via cashier." });
        }

        StripeConfiguration.ApiKey = stripeSecretKey;

        var amountInCents = (long)Math.Round(calc.TotalAmount * 100, MidpointRounding.AwayFromZero);
        var options = new PaymentIntentCreateOptions
        {
            Amount = amountInCents,
            Currency = "azn",
            AutomaticPaymentMethods = new PaymentIntentAutomaticPaymentMethodsOptions
            {
                Enabled = true,
            },
            Metadata = new Dictionary<string, string>
            {
                { "UserId", userId.Value.ToString() },
                { "AppliedPromoCode", calc.AppliedPromoCode ?? "" },
                { "OriginalTotal", calc.OriginalTotal.ToString("F2") },
                { "DiscountAmount", calc.Discount.ToString("F2") },
                { "TotalAmount", calc.TotalAmount.ToString("F2") },
                { "CashbackAmount", calc.CashbackAmount.ToString("F2") }
            },
            Description = $"Rednest Coffee Order for user {userId.Value}"
        };

        var service = new PaymentIntentService();
        PaymentIntent intent;
        try
        {
            intent = await service.CreateAsync(options);
        }
        catch (StripeException ex) when (ex.StripeError?.Code == "currency_unsupported" || ex.Message.Contains("currency", StringComparison.OrdinalIgnoreCase))
        {
            options.Currency = "usd";
            intent = await service.CreateAsync(options);
        }
        catch (StripeException ex)
        {
            return StatusCode(500, new { message = $"Stripe error: {ex.Message}" });
        }

        return Ok(new
        {
            clientSecret = intent.ClientSecret,
            paymentIntentId = intent.Id,
            totalAmount = calc.TotalAmount,
            discountAmount = calc.Discount,
            originalTotal = calc.OriginalTotal,
            cashbackEarned = calc.CashbackAmount,
            currency = intent.Currency
        });
    }

    [HttpPost("stripe/confirm")]
    public async Task<IActionResult> ConfirmStripeOrder([FromBody] ConfirmStripeOrderRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.PaymentIntentId))
        {
            return BadRequest(new { message = "PaymentIntentId is required." });
        }

        var stripeSecretKey = StripWhitespace(Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY") ?? "");
        if (string.IsNullOrEmpty(stripeSecretKey))
        {
            return StatusCode(500, new { message = "Stripe secret key is not configured on the server." });
        }

        StripeConfiguration.ApiKey = stripeSecretKey;
        var service = new PaymentIntentService();
        PaymentIntent intent;
        try
        {
            intent = await service.GetAsync(request.PaymentIntentId);
        }
        catch (StripeException ex)
        {
            return StatusCode(500, new { message = $"Stripe error: {ex.Message}" });
        }

        if (intent == null || intent.Status != "succeeded")
        {
            return BadRequest(new { message = $"Payment status is '{intent?.Status}'. Payment has not succeeded yet." });
        }

        var basket = await _userRepository.GetBasketByUserIdAsync(userId.Value);
        if (basket == null || basket.Items == null || basket.Items.Count == 0)
        {
            var existingOrders = await _userRepository.GetAllOrdersByUserIdAsync(userId.Value);
            var existingOrder = existingOrders.FirstOrDefault(o =>
                o.Payment?.PaymentIntentId == request.PaymentIntentId ||
                o.Notes?.CustomerNote == request.PaymentIntentId);
            if (existingOrder != null)
            {
                return Ok(new
                {
                    success = true,
                    id = existingOrder.Id,
                    status = existingOrder.Status,
                    createdAt = existingOrder.CreatedAt,
                    items = existingOrder.Items,
                    payment = existingOrder.Payment,
                    notes = existingOrder.Notes
                });
            }

            return BadRequest(new { message = "Basket is empty." });
        }

        var calc = await CalculateOrderAsync(userId.Value, basket);
        if (calc == null || calc.OrderItems.Count == 0)
        {
            return BadRequest(new { message = "Items from basket not found in catalog." });
        }

        var user = await _userRepository.GetByIdAsync(userId.Value);
        decimal? remainingBalance = null;

        if (user != null && calc.CashbackAmount > 0)
        {
            user.Balance = Math.Round(user.Balance + calc.CashbackAmount, 2);
            await _userRepository.UpdateAsync(user);
            remainingBalance = user.Balance;
        }

        if (calc.Promo != null && (calc.Discount > 0 || calc.CashbackAmount > 0))
        {
            calc.Promo.IsActive = false;
            await _userRepository.UpdateUserPromoAsync(calc.Promo);
        }

        var paymentMethod = CorePaymentMethod.OnlineStripe;
        if (!string.IsNullOrEmpty(request.PaymentMethod))
        {
            var pm = request.PaymentMethod.Trim();
            if (pm.Equals("OnlineCardDetails", StringComparison.OrdinalIgnoreCase) ||
                pm.Equals("visa", StringComparison.OrdinalIgnoreCase) ||
                pm.Equals("mastercard", StringComparison.OrdinalIgnoreCase))
            {
                paymentMethod = CorePaymentMethod.OnlineCardDetails;
            }
            else if (pm.Equals("OnlineGooglePay", StringComparison.OrdinalIgnoreCase) ||
                     pm.Equals("gpay", StringComparison.OrdinalIgnoreCase) ||
                     pm.Equals("googlepay", StringComparison.OrdinalIgnoreCase))
            {
                paymentMethod = CorePaymentMethod.OnlineGooglePay;
            }
        }

        var paymentDetails = new OrderPaymentDetails
        {
            PaymentMethod = paymentMethod,
            OriginalTotal = calc.OriginalTotal,
            DiscountAmount = calc.Discount,
            TotalAmount = calc.TotalAmount,
            PromoCode = calc.AppliedPromoCode,
            PromoPrizeName = calc.AppliedPromoName,
            PaymentIntentId = request.PaymentIntentId
        };

        var notes = new OrderNotes
        {
            Comment = string.IsNullOrWhiteSpace(request.Notes?.Comment) ? null : request.Notes.Comment.Trim(),
            CustomerNote = string.IsNullOrWhiteSpace(request.Notes?.CustomerNote) ? null : request.Notes.CustomerNote.Trim(),
            KitchenNote = string.IsNullOrWhiteSpace(request.Notes?.KitchenNote) ? null : request.Notes.KitchenNote.Trim()
        };

        var newOrder = new Order
        {
            Id = Guid.NewGuid(),
            UserId = userId.Value,
            CreatedAt = DateTime.UtcNow,
            Status = "Paid Online",
            Items = calc.OrderItems,
            Payment = paymentDetails,
            Notes = notes
        };

        await _userRepository.AddOrderAsync(newOrder);

        basket.Items.Clear();
        await _userRepository.UpdateBasketAsync(basket);

        return Ok(new
        {
            success = true,
            id = newOrder.Id,
            status = newOrder.Status,
            createdAt = newOrder.CreatedAt,
            items = newOrder.Items,
            payment = newOrder.Payment,
            notes = newOrder.Notes,
            remainingBalance,
            cashbackEarned = calc.CashbackAmount
        });
    }

    [HttpPost("cashier")]
    public async Task<IActionResult> CreateCashierOrder([FromBody] CashierOrderRequest? request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var basket = await _userRepository.GetBasketByUserIdAsync(userId.Value);
        if (basket == null || basket.Items == null || basket.Items.Count == 0)
        {
            return BadRequest(new { message = "Basket is empty." });
        }

        var calc = await CalculateOrderAsync(userId.Value, basket);
        if (calc == null || calc.OrderItems.Count == 0)
        {
            return BadRequest(new { message = "Items from basket not found in catalog." });
        }

        var paymentMethod = CorePaymentMethod.CashDeskCash;
        if (request != null && !string.IsNullOrEmpty(request.PaymentMethod))
        {
            var pm = request.PaymentMethod.Trim();
            if (pm.Equals("card", StringComparison.OrdinalIgnoreCase) ||
                pm.Equals("CashDeskCard", StringComparison.OrdinalIgnoreCase) ||
                pm.Equals("nfc", StringComparison.OrdinalIgnoreCase) ||
                pm.Equals("CashDeskNfc", StringComparison.OrdinalIgnoreCase))
            {
                paymentMethod = CorePaymentMethod.CashDeskCard;
            }
            else if (pm.Equals("balance", StringComparison.OrdinalIgnoreCase) ||
                     pm.Equals("wallet", StringComparison.OrdinalIgnoreCase) ||
                     pm.Equals("OnlineBalance", StringComparison.OrdinalIgnoreCase))
            {
                paymentMethod = CorePaymentMethod.OnlineBalance;
            }
            else if (pm.Equals("visa", StringComparison.OrdinalIgnoreCase) ||
                     pm.Equals("mastercard", StringComparison.OrdinalIgnoreCase) ||
                     pm.Equals("online_card", StringComparison.OrdinalIgnoreCase) ||
                     pm.Equals("OnlineCardDetails", StringComparison.OrdinalIgnoreCase))
            {
                paymentMethod = CorePaymentMethod.OnlineCardDetails;
            }
            else if (pm.Equals("stripe", StringComparison.OrdinalIgnoreCase) ||
                     pm.Equals("OnlineStripe", StringComparison.OrdinalIgnoreCase))
            {
                paymentMethod = CorePaymentMethod.OnlineStripe;
            }
            else if (pm.Equals("gpay", StringComparison.OrdinalIgnoreCase) ||
                     pm.Equals("googlepay", StringComparison.OrdinalIgnoreCase) ||
                     pm.Equals("OnlineGooglePay", StringComparison.OrdinalIgnoreCase))
            {
                paymentMethod = CorePaymentMethod.OnlineGooglePay;
            }
        }

        var user = await _userRepository.GetByIdAsync(userId.Value);
        decimal? remainingBalance = null;
        bool balanceChanged = false;

        if (paymentMethod == CorePaymentMethod.OnlineBalance)
        {
            if (user == null || user.Balance < calc.TotalAmount)
            {
                return BadRequest(new { message = "Insufficient balance on your Rednest account." });
            }
            user.Balance = Math.Round(user.Balance - calc.TotalAmount, 2);
            balanceChanged = true;
        }

        if (user != null && calc.CashbackAmount > 0)
        {
            user.Balance = Math.Round(user.Balance + calc.CashbackAmount, 2);
            balanceChanged = true;
        }

        if (user != null && balanceChanged)
        {
            await _userRepository.UpdateAsync(user);
            remainingBalance = user.Balance;
        }

        if (calc.Promo != null && (calc.Discount > 0 || calc.CashbackAmount > 0))
        {
            calc.Promo.IsActive = false;
            await _userRepository.UpdateUserPromoAsync(calc.Promo);
        }

        var paymentDetails = new OrderPaymentDetails
        {
            PaymentMethod = paymentMethod,
            OriginalTotal = calc.OriginalTotal,
            DiscountAmount = calc.Discount,
            TotalAmount = calc.TotalAmount,
            PromoCode = calc.AppliedPromoCode,
            PromoPrizeName = calc.AppliedPromoName
        };

        var orderStatus = paymentMethod == CorePaymentMethod.OnlineBalance ? "Paid Online" : "Pending Payment";

        var notes = new OrderNotes
        {
            Comment = string.IsNullOrWhiteSpace(request?.Notes?.Comment) ? null : request.Notes.Comment.Trim(),
            CustomerNote = string.IsNullOrWhiteSpace(request?.Notes?.CustomerNote) ? null : request.Notes.CustomerNote.Trim(),
            KitchenNote = string.IsNullOrWhiteSpace(request?.Notes?.KitchenNote) ? null : request.Notes.KitchenNote.Trim()
        };

        var newOrder = new Order
        {
            Id = Guid.NewGuid(),
            UserId = userId.Value,
            CreatedAt = DateTime.UtcNow,
            Status = orderStatus,
            Items = calc.OrderItems,
            Payment = paymentDetails,
            Notes = notes
        };
        await _userRepository.AddOrderAsync(newOrder);

        basket.Items.Clear();
        await _userRepository.UpdateBasketAsync(basket);

        return Ok(new
        {
            success = true,
            id = newOrder.Id,
            status = newOrder.Status,
            createdAt = newOrder.CreatedAt,
            items = newOrder.Items,
            payment = newOrder.Payment,
            notes = newOrder.Notes,
            remainingBalance,
            cashbackEarned = calc.CashbackAmount
        });
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActiveOrder()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var activeOrder = await _userRepository.GetActiveOrderByUserIdAsync(userId.Value);
        if (activeOrder == null || activeOrder.Items == null || activeOrder.Items.Count == 0)
        {
            return Ok(new { hasActiveOrder = false, order = (Order?)null });
        }

        var productIds = activeOrder.Items.Select(i => i.ProductId).Distinct().ToList();
        var products = await _context.Products
            .Where(p => productIds.Contains(p.Id))
            .AsNoTracking()
            .ToDictionaryAsync(p => p.Id);

        return Ok(new
        {
            hasActiveOrder = true,
            id = activeOrder.Id,
            status = activeOrder.Status,
            createdAt = activeOrder.CreatedAt,
            items = activeOrder.Items.Select(i => new
            {
                productId = i.ProductId,
                quantity = i.Quantity,
                unitPrice = i.UnitPrice,
                name = products.TryGetValue(i.ProductId, out var prod) ? prod.Name : "Product",
                imageUrl = products.TryGetValue(i.ProductId, out var prod2) ? prod2.ImageUrl : null,
                category = products.TryGetValue(i.ProductId, out var prod3) ? prod3.Category : ""
            }).ToList(),
            payment = new
            {
                paymentMethod = activeOrder.Payment.PaymentMethod.ToString(),
                originalTotal = activeOrder.Payment.OriginalTotal,
                discountAmount = activeOrder.Payment.DiscountAmount,
                totalAmount = activeOrder.Payment.TotalAmount,
                promoCode = activeOrder.Payment.PromoCode,
                promoPrizeName = activeOrder.Payment.PromoPrizeName
            },
            notes = activeOrder.Notes
        });
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetOrderHistory()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var allOrders = await _userRepository.GetAllOrdersByUserIdAsync(userId.Value);
        var allProductIds = allOrders
            .SelectMany(o => o.Items)
            .Select(i => i.ProductId)
            .Distinct()
            .ToList();

        var products = await _context.Products
            .Where(p => allProductIds.Contains(p.Id))
            .AsNoTracking()
            .ToDictionaryAsync(p => p.Id);

        return Ok(new
        {
            orders = allOrders.Select(o => new
            {
                id = o.Id,
                status = o.Status,
                createdAt = o.CreatedAt,
                items = o.Items.Select(i => new
                {
                    productId = i.ProductId,
                    quantity = i.Quantity,
                    unitPrice = i.UnitPrice,
                    name = products.TryGetValue(i.ProductId, out var prod) ? prod.Name : "Product",
                    imageUrl = products.TryGetValue(i.ProductId, out var prod2) ? prod2.ImageUrl : null,
                    category = products.TryGetValue(i.ProductId, out var prod3) ? prod3.Category : ""
                }).ToList(),
                payment = new
                {
                    paymentMethod = o.Payment.PaymentMethod.ToString(),
                    originalTotal = o.Payment.OriginalTotal,
                    discountAmount = o.Payment.DiscountAmount,
                    totalAmount = o.Payment.TotalAmount,
                    promoCode = o.Payment.PromoCode,
                    promoPrizeName = o.Payment.PromoPrizeName
                },
                notes = o.Notes
            }).ToList()
        });
    }

    private static string StripWhitespace(string value)
        => Regex.Replace(value, @"\s+", "");
}

public class OrderCalculationResult
{
    public decimal OriginalTotal { get; set; }
    public decimal Discount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal CashbackAmount { get; set; }
    public int CashbackPercent { get; set; }
    public string? AppliedPromoCode { get; set; }
    public string? AppliedPromoName { get; set; }
    public UserPromo? Promo { get; set; }
    public List<OrderProductItem> OrderItems { get; set; } = new();
}

public class CashierOrderRequest
{
    public string? PaymentMethod { get; set; }
    public OrderNotes? Notes { get; set; }
}

public class StripeIntentRequest
{
    public string? PaymentMethod { get; set; }
    public OrderNotes? Notes { get; set; }
}

public class ConfirmStripeOrderRequest
{
    public string PaymentIntentId { get; set; } = string.Empty;
    public string? PaymentMethod { get; set; }
    public OrderNotes? Notes { get; set; }
}

