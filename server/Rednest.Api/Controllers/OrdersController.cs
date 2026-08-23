using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rednest.Application.Interfaces;
using Rednest.Core.Entities;
using Rednest.Infrastructure.Data;
using System.Security.Claims;

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

        if (enriched.Count == 0)
        {
            return BadRequest(new { message = "Items from basket not found in catalog." });
        }

        decimal originalTotal = Math.Round(enriched.Sum(x => x.Product!.Price * x.Item.Quantity), 2);
        decimal discount = 0m;
        string? appliedPromoCode = null;
        string? appliedPromoName = null;

        var promo = await _userRepository.GetActiveUserPromoAsync(userId.Value);
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

                promo.IsActive = false;
                await _userRepository.UpdateUserPromoAsync(promo);
            }
        }

        decimal totalAmount = Math.Max(0m, Math.Round(originalTotal - discount, 2));

        var paymentMethod = PaymentMethod.CashDeskCash;
        if (request != null && !string.IsNullOrEmpty(request.PaymentMethod))
        {
            var pm = request.PaymentMethod.Trim();
            if (pm.Equals("card", StringComparison.OrdinalIgnoreCase) ||
                pm.Equals("CashDeskCard", StringComparison.OrdinalIgnoreCase) ||
                pm.Equals("nfc", StringComparison.OrdinalIgnoreCase) ||
                pm.Equals("CashDeskNfc", StringComparison.OrdinalIgnoreCase))
            {
                paymentMethod = PaymentMethod.CashDeskCard;
            }
            else if (pm.Equals("balance", StringComparison.OrdinalIgnoreCase) ||
                     pm.Equals("wallet", StringComparison.OrdinalIgnoreCase) ||
                     pm.Equals("OnlineBalance", StringComparison.OrdinalIgnoreCase))
            {
                paymentMethod = PaymentMethod.OnlineBalance;
            }
            else if (pm.Equals("visa", StringComparison.OrdinalIgnoreCase) ||
                     pm.Equals("mastercard", StringComparison.OrdinalIgnoreCase) ||
                     pm.Equals("online_card", StringComparison.OrdinalIgnoreCase) ||
                     pm.Equals("OnlineCardDetails", StringComparison.OrdinalIgnoreCase))
            {
                paymentMethod = PaymentMethod.OnlineCardDetails;
            }
            else if (pm.Equals("stripe", StringComparison.OrdinalIgnoreCase) ||
                     pm.Equals("OnlineStripe", StringComparison.OrdinalIgnoreCase))
            {
                paymentMethod = PaymentMethod.OnlineStripe;
            }
            else if (pm.Equals("gpay", StringComparison.OrdinalIgnoreCase) ||
                     pm.Equals("googlepay", StringComparison.OrdinalIgnoreCase) ||
                     pm.Equals("OnlineGooglePay", StringComparison.OrdinalIgnoreCase))
            {
                paymentMethod = PaymentMethod.OnlineGooglePay;
            }
        }

        var paymentDetails = new OrderPaymentDetails
        {
            PaymentMethod = paymentMethod,
            OriginalTotal = originalTotal,
            DiscountAmount = discount,
            TotalAmount = totalAmount,
            PromoCode = appliedPromoCode,
            PromoPrizeName = appliedPromoName
        };

        var orderItems = enriched.Select(x => new OrderProductItem
        {
            ProductId = x.Product!.Id,
            Quantity = x.Item.Quantity,
            UnitPrice = x.Product.Price
        }).ToList();

        var newOrder = new Order
        {
            Id = Guid.NewGuid(),
            UserId = userId.Value,
            CreatedAt = DateTime.UtcNow,
            Status = "Pending Payment",
            Items = orderItems,
            Payment = paymentDetails
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
            payment = newOrder.Payment
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

        return Ok(new
        {
            hasActiveOrder = true,
            id = activeOrder.Id,
            status = activeOrder.Status,
            createdAt = activeOrder.CreatedAt,
            items = activeOrder.Items,
            payment = activeOrder.Payment
        });
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetOrderHistory()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var allOrders = await _userRepository.GetAllOrdersByUserIdAsync(userId.Value);
        return Ok(new
        {
            orders = allOrders.Select(o => new
            {
                id = o.Id,
                status = o.Status,
                createdAt = o.CreatedAt,
                items = o.Items,
                payment = o.Payment
            }).ToList()
        });
    }
}

public class CashierOrderRequest
{
    public string? PaymentMethod { get; set; }
}
