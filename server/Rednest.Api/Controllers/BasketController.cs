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
public class BasketController : ControllerBase
{
    private readonly IUserRepository _userRepository;

    public BasketController(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }


    private Guid? GetUserId()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
            return null;
        return userId;
    }

    private static DateTime GetBakuTime() => DateTime.UtcNow.AddHours(4);

    [HttpGet]
    public async Task<IActionResult> GetBasket()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var basket = await _userRepository.GetBasketByUserIdAsync(userId.Value);

        var items = basket?.Items ?? new List<BasketItem>();

        return Ok(new
        {
            items = items.Select(i => new
            {
                productId = i.ProductId,
                addedAt = i.AddedAt,
                quantity = i.Quantity
            })
        });
    }

    [HttpPost("add")]
    public async Task<IActionResult> AddItem([FromBody] BasketItemRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var basket = await _userRepository.GetBasketByUserIdAsync(userId.Value);

        if (basket == null)
        {
            basket = new UserBasket
            {
                UserId = userId.Value,
                Items = new List<BasketItem>
                {
                    new BasketItem
                    {
                        ProductId = request.ProductId,
                        AddedAt = GetBakuTime(),
                        Quantity = 1
                    }
                }
            };
            await _userRepository.AddBasketAsync(basket);
        }
        else
        {
            var existing = basket.Items.FirstOrDefault(i => i.ProductId == request.ProductId);
            if (existing != null)
            {
                if (existing.Quantity < 100)
                {
                    existing.Quantity += 1;
                }
            }
            else
            {
                basket.Items.Add(new BasketItem
                {
                    ProductId = request.ProductId,
                    AddedAt = GetBakuTime(),
                    Quantity = 1
                });
            }
            await _userRepository.UpdateBasketAsync(basket);
        }

        return Ok(new { items = FormatBasketItems(basket.Items) });
    }

    [HttpPost("remove")]
    public async Task<IActionResult> RemoveItem([FromBody] BasketItemRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var basket = await _userRepository.GetBasketByUserIdAsync(userId.Value);
        if (basket == null) return Ok(new { items = Array.Empty<object>() });

        var existing = basket.Items.FirstOrDefault(i => i.ProductId == request.ProductId);
        if (existing == null) return Ok(new { items = FormatBasketItems(basket.Items) });

        existing.Quantity -= 1;
        if (existing.Quantity <= 0)
        {
            basket.Items.Remove(existing);
        }

        await _userRepository.UpdateBasketAsync(basket);
        return Ok(new { items = FormatBasketItems(basket.Items) });
    }

    [HttpDelete("delete/{productId}")]
    public async Task<IActionResult> DeleteItem(Guid productId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var basket = await _userRepository.GetBasketByUserIdAsync(userId.Value);
        if (basket == null) return Ok(new { items = Array.Empty<object>() });

        basket.Items.RemoveAll(i => i.ProductId == productId);
        await _userRepository.UpdateBasketAsync(basket);
        return Ok(new { items = FormatBasketItems(basket.Items) });
    }

    [HttpPost("sync")]
    public async Task<IActionResult> SyncBasket([FromBody] SyncBasketRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (request.Items == null || request.Items.Count == 0)
            return Ok();

        var basket = await _userRepository.GetBasketByUserIdAsync(userId.Value);

        if (basket == null)
        {
            basket = new UserBasket
            {
                UserId = userId.Value,
                Items = request.Items.Select(i => new BasketItem
                {
                    ProductId = i.ProductId,
                    AddedAt = i.AddedAt != default ? i.AddedAt : GetBakuTime(),
                    Quantity = Math.Min(100, Math.Max(1, i.Quantity))
                }).ToList()
            };
            await _userRepository.AddBasketAsync(basket);
        }
        else
        {
            foreach (var incoming in request.Items)
            {
                var existing = basket.Items.FirstOrDefault(i => i.ProductId == incoming.ProductId);
                if (existing != null)
                {
                    existing.Quantity = Math.Min(100, existing.Quantity + incoming.Quantity);
                }
                else
                {
                    basket.Items.Add(new BasketItem
                    {
                        ProductId = incoming.ProductId,
                        AddedAt = incoming.AddedAt != default ? incoming.AddedAt : GetBakuTime(),
                        Quantity = Math.Min(100, Math.Max(1, incoming.Quantity))
                    });
                }
            }
            await _userRepository.UpdateBasketAsync(basket);
        }

        return Ok(new { items = FormatBasketItems(basket.Items) });
    }

    private static object FormatBasketItems(IEnumerable<BasketItem> items) =>
        items.Select(i => new
        {
            productId = i.ProductId,
            addedAt = i.AddedAt,
            quantity = i.Quantity
        });


    [HttpPost("apply-promo")]
    public async Task<IActionResult> ApplyPromo(
        [FromBody] Rednest.Application.DTOs.ApplyPromoRequest request,
        [FromServices] AppDbContext db)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var promo = await _userRepository.GetActiveUserPromoAsync(userId.Value);
        if (promo == null || !promo.IsActive || promo.Dates.ExpiresAt < DateTime.UtcNow)
            return Ok(new Rednest.Application.DTOs.ApplyPromoResponse { Applied = false });

        if (!string.Equals(promo.Codes.PromoCode, request.PromoCode, StringComparison.OrdinalIgnoreCase))
            return Ok(new Rednest.Application.DTOs.ApplyPromoResponse { Applied = false, Message = "Invalid promo code." });

        var basket = await _userRepository.GetBasketByUserIdAsync(userId.Value);
        if (basket == null || basket.Items.Count == 0)
            return Ok(new Rednest.Application.DTOs.ApplyPromoResponse { Applied = false, Message = "Basket is empty." });

        var productIds = basket.Items.Select(i => i.ProductId).ToList();
        var products = await db.Products
            .Where(p => productIds.Contains(p.Id))
            .AsNoTracking()
            .ToListAsync();

        var enriched = basket.Items
            .Select(i => new { Item = i, Product = products.FirstOrDefault(p => p.Id == i.ProductId) })
            .Where(x => x.Product != null)
            .ToList();

        var grandTotal = enriched.Sum(x => x.Product!.Price * x.Item.Quantity);

        decimal discount = 0m;
        string message = string.Empty;

        switch (promo.PrizeInfo.Type)
        {
            case Rednest.Core.Entities.PrizeType.Discount25:
                discount = Math.Round(grandTotal * 0.25m, 2);
                message = "25% discount applied";
                break;

            case Rednest.Core.Entities.PrizeType.Discount50:
                discount = Math.Round(grandTotal * 0.50m, 2);
                message = "50% discount applied";
                break;

            case Rednest.Core.Entities.PrizeType.SuperPrize:
                discount = Math.Min(grandTotal, 25.00m);
                message = "Super prize: free order up to 25 AZN";
                break;

            case Rednest.Core.Entities.PrizeType.FreeDrink:
            {
                var drinkCategories = new[] { "Main Drinks", "Specialty Drinks" };
                var drinks = enriched.Where(x => drinkCategories.Contains(x.Product!.Category)).ToList();
                if (drinks.Count > 0)
                {
                    var totalDrinkQty = drinks.Sum(x => x.Item.Quantity);
                    var totalDrinkPrice = drinks.Sum(x => x.Product!.Price * x.Item.Quantity);
                    var avgDrinkPrice = totalDrinkPrice / totalDrinkQty;
                    discount = Math.Round(avgDrinkPrice, 2);
                    message = "Free drink applied";
                }
                break;
            }

            case Rednest.Core.Entities.PrizeType.FreeDessert:
            {
                var desserts = enriched.Where(x => x.Product!.Category == "Desserts").ToList();
                if (desserts.Count > 0)
                {
                    var totalDessertQty = desserts.Sum(x => x.Item.Quantity);
                    var totalDessertPrice = desserts.Sum(x => x.Product!.Price * x.Item.Quantity);
                    var avgDessertPrice = totalDessertPrice / totalDessertQty;
                    discount = Math.Round(avgDessertPrice, 2);
                    message = "Free dessert applied";
                }
                break;
            }

            default:
                break;
        }

        if (discount <= 0)
        {
            return Ok(new Rednest.Application.DTOs.ApplyPromoResponse { Applied = false });
        }

        discount = Math.Min(discount, grandTotal);
        var newTotal = Math.Round(grandTotal - discount, 2);

        return Ok(new Rednest.Application.DTOs.ApplyPromoResponse
        {
            Applied = true,
            PrizeType = promo.PrizeInfo.Type.ToString(),
            PrizeName = promo.PrizeInfo.PrizeName,
            DiscountAmount = discount,
            OriginalTotal = Math.Round(grandTotal, 2),
            NewTotal = newTotal,
            Message = message
        });

    }
}

public class BasketItemRequest
{
    public Guid ProductId { get; set; }
}

public class SyncBasketRequest
{
    public List<SyncBasketItem> Items { get; set; } = new();
}

public class SyncBasketItem
{
    public Guid ProductId { get; set; }
    public DateTime AddedAt { get; set; }
    public int Quantity { get; set; }
}
