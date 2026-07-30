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

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("accessToken");
        Response.Cookies.Delete("refreshToken");
        return Ok();
    }

    private void SetTokenCookies(string accessToken, string refreshToken)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true, // Must be true for HTTPS (Render provides HTTPS)
            SameSite = SameSiteMode.Strict,
            Expires = DateTime.UtcNow.AddDays(30)
        };

        Response.Cookies.Append("accessToken", accessToken, cookieOptions);
        Response.Cookies.Append("refreshToken", refreshToken, cookieOptions);
    }
}
