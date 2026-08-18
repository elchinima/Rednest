using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rednest.Application.Interfaces;
using Rednest.Core.Entities;
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
                existing.Quantity += 1;
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

        return Ok();
    }

    [HttpPost("remove")]
    public async Task<IActionResult> RemoveItem([FromBody] BasketItemRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var basket = await _userRepository.GetBasketByUserIdAsync(userId.Value);
        if (basket == null) return Ok();

        var existing = basket.Items.FirstOrDefault(i => i.ProductId == request.ProductId);
        if (existing == null) return Ok();

        existing.Quantity -= 1;
        if (existing.Quantity <= 0)
        {
            basket.Items.Remove(existing);
        }

        await _userRepository.UpdateBasketAsync(basket);
        return Ok();
    }

    [HttpDelete("delete/{productId}")]
    public async Task<IActionResult> DeleteItem(Guid productId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var basket = await _userRepository.GetBasketByUserIdAsync(userId.Value);
        if (basket == null) return Ok();

        basket.Items.RemoveAll(i => i.ProductId == productId);
        await _userRepository.UpdateBasketAsync(basket);

        return Ok();
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
                    Quantity = i.Quantity
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
                    existing.Quantity += incoming.Quantity;
                }
                else
                {
                    basket.Items.Add(new BasketItem
                    {
                        ProductId = incoming.ProductId,
                        AddedAt = incoming.AddedAt != default ? incoming.AddedAt : GetBakuTime(),
                        Quantity = incoming.Quantity
                    });
                }
            }
            await _userRepository.UpdateBasketAsync(basket);
        }

        return Ok();
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
