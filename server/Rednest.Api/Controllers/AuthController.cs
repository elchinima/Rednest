using Microsoft.AspNetCore.Mvc;
using Rednest.Application.DTOs;
using Rednest.Application.Interfaces;
using System.Security.Claims;

namespace Rednest.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            var ipAddress = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim()
                            ?? HttpContext.Connection.RemoteIpAddress?.ToString();
            var result = await _authService.AuthenticateOrRegisterAsync(request, ipAddress);
            SetTokenCookies(result.AccessToken, result.RefreshToken);
            return Ok(new 
            { 
                HasName = result.HasName 
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { Message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        var refreshToken = Request.Cookies["refreshToken"];
        if (string.IsNullOrEmpty(refreshToken))
        {
            return Unauthorized(new { Message = "No refresh token provided." });
        }
        try
        {
            var result = await _authService.RefreshTokenAsync(refreshToken);
            SetTokenCookies(result.AccessToken, result.RefreshToken);
            return Ok();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { Message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    [Microsoft.AspNetCore.Authorization.Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMe([FromServices] IUserRepository userRepository)
    {
        try
        {
            var userIdString = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
            {
                return Unauthorized();
            }

            var user = await userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                return NotFound("User not found.");
            }

            return Ok(new { Id = user.Id, Name = user.Name });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    [Microsoft.AspNetCore.Authorization.Authorize]
    [HttpPut("name")]
    public async Task<IActionResult> UpdateName(
        [FromBody] UpdateNameRequest nameRequest, 
        [FromServices] IUserRepository userRepository)
    {
        try
        {
            var userIdString = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
            {
                return Unauthorized();
            }

            var user = await userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                return NotFound("User not found.");
            }

            user.Name = nameRequest.Name;
            await userRepository.UpdateAsync(user);

            return Ok();
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    [Microsoft.AspNetCore.Authorization.Authorize]
    [HttpGet("promo")]
    public async Task<IActionResult> GetPromo([FromServices] IUserRepository userRepository)
    {
        try
        {
            var userIdString = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
                return Unauthorized();

            var promo = await userRepository.GetActiveUserPromoAsync(userId);
            if (promo == null)
                return Ok(new { hasPromo = false, isActive = false });

            if (promo.Dates.ExpiresAt < DateTime.UtcNow)
            {
                promo.IsActive = false;
                await userRepository.UpdateUserPromoAsync(promo);
                return Ok(new { hasPromo = true, isActive = false });
            }

            return Ok(new
            {
                hasPromo = true,
                promoCode = promo.Codes.PromoCode,
                prizeName = promo.PrizeInfo.PrizeName,
                prizeDescription = promo.PrizeInfo.PrizeDescription,
                prizeType = promo.PrizeInfo.Type.ToString(),
                cashbackPercent = promo.PrizeInfo.CashbackPercent,
                barCode = promo.Codes.BarCode,
                isActive = promo.IsActive,
                activatedAt = promo.Dates.ActivatedAt,
                expiresAt = promo.Dates.ExpiresAt
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    [Microsoft.AspNetCore.Authorization.Authorize]
    [HttpPost("promo")]
    public async Task<IActionResult> SavePromo(
        [FromServices] IUserRepository userRepository)
    {
        try
        {
            var userIdString = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
                return Unauthorized();

            var activePromo = await userRepository.GetActiveUserPromoAsync(userId);

            if (activePromo != null)
            {
                if (activePromo.Dates.ExpiresAt < DateTime.UtcNow)
                {
                    activePromo.IsActive = false;
                    await userRepository.UpdateUserPromoAsync(activePromo);
                }
                else
                {
                    return Conflict(new { Message = "User already has an active promo." });
                }
            }

            var prizeType = PickWeightedPrize();
            var cashbackPercent = prizeType == Rednest.Core.Entities.PrizeType.CashbackOnPurchases
                ? Random.Shared.Next(1, 11)
                : 0;

            var (prizeName, prizeDescription) = GetPrizeDetails(prizeType, cashbackPercent);
            var segmentIndex = (int)prizeType;

            var now = DateTime.UtcNow;
            var promo = new Rednest.Core.Entities.UserPromo
            {
                UserId = userId,
                PrizeInfo = new Rednest.Core.Entities.PrizeInfo
                {
                    Type = prizeType,
                    PrizeName = prizeName,
                    PrizeDescription = prizeDescription,
                    CashbackPercent = cashbackPercent
                },
                Dates = new Rednest.Core.Entities.PromoDates
                {
                    ActivatedAt = now,
                    ExpiresAt = now.AddDays(7)
                },
                IsActive = true
            };

            var barCode = new string(promo.Id.ToString().Where(char.IsDigit).ToArray());
            var promoCode = promo.Id.ToString("N")[..8].ToUpper();
            promo.Codes = new Rednest.Core.Entities.PromoCodes { PromoCode = promoCode, BarCode = barCode };

            await userRepository.AddUserPromoAsync(promo);

            return Ok(new
            {
                segmentIndex,
                prizeType = prizeType.ToString(),
                prizeName,
                prizeDescription,
                promoCode,
                barCode,
                cashbackPercent,
                expiresAt = now.AddDays(7)
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    private static Rednest.Core.Entities.PrizeType PickWeightedPrize()
    {
        var roll = Random.Shared.Next(1, 101);
        return roll switch
        {
            <= 1  => Rednest.Core.Entities.PrizeType.SuperPrize,
            <= 11 => Rednest.Core.Entities.PrizeType.FreeDrink,
            <= 21 => Rednest.Core.Entities.PrizeType.FreeDessert,
            <= 36 => Rednest.Core.Entities.PrizeType.Discount25,
            <= 90 => Rednest.Core.Entities.PrizeType.CashbackOnPurchases,
            _     => Rednest.Core.Entities.PrizeType.Discount50
        };
    }

    private static (string Name, string Description) GetPrizeDetails(
        Rednest.Core.Entities.PrizeType prizeType, int cashbackPercent) => prizeType switch
    {
        Rednest.Core.Entities.PrizeType.SuperPrize =>
            ("SUPER PRIZE", "Free order up to 25 AZN!"),
        Rednest.Core.Entities.PrizeType.FreeDrink =>
            ("FREE DRINK", "One free drink with your next order!"),
        Rednest.Core.Entities.PrizeType.FreeDessert =>
            ("FREE DESSERT", "One free dessert with your next order!"),
        Rednest.Core.Entities.PrizeType.Discount25 =>
            ("DISCOUNT UP TO 25%", "25% discount on your next order!"),
        Rednest.Core.Entities.PrizeType.CashbackOnPurchases =>
            ("CASHBACK ON PURCHASES", $"{cashbackPercent}% cashback on your next order!"),
        Rednest.Core.Entities.PrizeType.Discount50 =>
            ("DISCOUNT UP TO 50%", "50% discount on your next order!"),
        _ => ("Prize", "Congratulations!")
    };

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("accessToken");
        Response.Cookies.Delete("refreshToken");
        return Ok();
    }

    private void SetTokenCookies(string accessToken, string refreshToken)
    {
        var accessCookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTime.UtcNow.AddMinutes(30)
        };

        var refreshCookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTime.UtcNow.AddDays(30)
        };

        Response.Cookies.Append("accessToken", accessToken, accessCookieOptions);
        Response.Cookies.Append("refreshToken", refreshToken, refreshCookieOptions);
    }
}
