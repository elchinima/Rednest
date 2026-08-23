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
            return BadRequest(new { message = "Корзина пуста." });
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
            return BadRequest(new { message = "Товары из корзины не найдены в каталоге." });
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
            if (request.PaymentMethod.Equals("card", StringComparison.OrdinalIgnoreCase) ||
                request.PaymentMethod.Equals("CashDeskCard", StringComparison.OrdinalIgnoreCase))
            {
                paymentMethod = PaymentMethod.CashDeskCard;
            }
        }

        var orderNumber = $"#RN-{Random.Shared.Next(1000, 9999)}";

        var orderEntry = new OrderEntry
        {
            OrderId = Guid.NewGuid(),
            OrderNumber = orderNumber,
            CreatedAt = GetBakuTime(),
            Products = enriched.Select(x => new OrderProductItem
            {
                ProductId = x.Product!.Id,
                Name = x.Product.Name,
                ImageUrl = x.Product.ImageUrl,
                Quantity = x.Item.Quantity,
                UnitPrice = x.Product.Price,
                TotalPrice = Math.Round(x.Product.Price * x.Item.Quantity, 2)
            }).ToList(),
            OriginalTotal = originalTotal,
            DiscountAmount = discount,
            TotalAmount = totalAmount,
            PromoCode = appliedPromoCode,
            PromoPrizeName = appliedPromoName,
            PaymentMethod = paymentMethod,
            Status = "Ожидание оплаты"
        };

        var userOrder = await _userRepository.GetOrderByUserIdAsync(userId.Value);
        if (userOrder == null)
        {
            userOrder = new Order
            {
                UserId = userId.Value,
                HasActiveOrder = true,
                Orders = new List<OrderEntry> { orderEntry }
            };
            await _userRepository.AddOrderAsync(userOrder);
        }
        else
        {
            userOrder.HasActiveOrder = true;
            userOrder.Orders.Add(orderEntry);
            await _userRepository.UpdateOrderAsync(userOrder);
        }

        basket.Items.Clear();
        await _userRepository.UpdateBasketAsync(basket);

        return Ok(new
        {
            success = true,
            order = orderEntry
        });
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActiveOrder()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var userOrder = await _userRepository.GetOrderByUserIdAsync(userId.Value);
        if (userOrder == null || !userOrder.HasActiveOrder || userOrder.Orders.Count == 0)
        {
            return Ok(new { hasActiveOrder = false, order = (OrderEntry?)null });
        }

        var activeOrder = userOrder.Orders.LastOrDefault(o => o.Status == "Ожидание оплаты") ?? userOrder.Orders.LastOrDefault();
        return Ok(new
        {
            hasActiveOrder = true,
            order = activeOrder
        });
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetOrderHistory()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var userOrder = await _userRepository.GetOrderByUserIdAsync(userId.Value);
        var orders = userOrder?.Orders?.OrderByDescending(o => o.CreatedAt).ToList() ?? new List<OrderEntry>();

        return Ok(new { orders });
    }
}

public class CashierOrderRequest
{
    public string? PaymentMethod { get; set; }
}
