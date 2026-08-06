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

            var promo = await userRepository.GetUserPromoAsync(userId);
            if (promo == null)
                return Ok(new { hasPromo = false });

            return Ok(new
            {
                hasPromo = true,
                promoCode = promo.PromoCode,
                prizeName = promo.PrizeName,
                prizeDescription = promo.PrizeDescription,
                barCode = promo.BarCode,
                isActive = promo.IsActive,
                activatedAt = promo.ActivatedAt,
                expiresAt = promo.ExpiresAt,
                isExpired = promo.ExpiresAt < DateTime.UtcNow
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
        [FromBody] SpinResultRequest request,
        [FromServices] IUserRepository userRepository)
    {
        try
        {
            var userIdString = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
                return Unauthorized();

            // Check if user already has an active (non-expired) promo from today
            var existing = await userRepository.GetUserPromoAsync(userId);
            if (existing != null && existing.ExpiresAt > DateTime.UtcNow)
                return Conflict(new { Message = "User already has an active promo." });

            // BarCode = digits only from userId
            var barCode = new string(userId.ToString().Where(char.IsDigit).ToArray());

            // PromoCode = random 8-char alphanumeric (uppercase)
            var promoCode = Guid.NewGuid().ToString("N")[..8].ToUpper();

            var now = DateTime.UtcNow;

            if (existing != null)
            {
                existing.PromoCode = promoCode;
                existing.PrizeName = request.PrizeName;
                existing.PrizeDescription = request.PrizeDescription;
                existing.BarCode = barCode;
                existing.IsActive = true;
                existing.ActivatedAt = now;
                existing.ExpiresAt = now.AddDays(7);
                await userRepository.UpdateUserPromoAsync(existing);
            }
            else
            {
                var promo = new Rednest.Core.Entities.UserPromo
                {
                    UserId = userId,
                    PromoCode = promoCode,
                    PrizeName = request.PrizeName,
                    PrizeDescription = request.PrizeDescription,
                    BarCode = barCode,
                    IsActive = true,
                    ActivatedAt = now,
                    ExpiresAt = now.AddDays(7)
                };
                await userRepository.AddUserPromoAsync(promo);
            }

            return Ok(new
            {
                promoCode = promoCode,
                barCode = barCode,
                expiresAt = now.AddDays(7)
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

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
