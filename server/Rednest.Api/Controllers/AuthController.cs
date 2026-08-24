using Microsoft.AspNetCore.Mvc;
using Rednest.Application.DTOs;
using Rednest.Application.Interfaces;
using System.Security.Claims;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace Rednest.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IHttpClientFactory _httpClientFactory;
    private static readonly string[] AllowedAvatarExtensions = [".png", ".jpg", ".jpeg"];
    private const long MaxAvatarSizeBytes = 10 * 1024 * 1024;

    public AuthController(IAuthService authService, IHttpClientFactory httpClientFactory)
    {
        _authService = authService;
        _httpClientFactory = httpClientFactory;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request,
        [FromServices] IUserRepository userRepository)
    {
        try
        {
            var ipAddress = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim()
                            ?? HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers["User-Agent"].ToString();
            var platformVersion = Request.Headers["Sec-CH-UA-Platform-Version"].FirstOrDefault()
                                  ?? Request.Headers["X-Platform-Version"].FirstOrDefault();
            var deviceModel = Request.Headers["Sec-CH-UA-Model"].FirstOrDefault()
                              ?? Request.Headers["X-Device-Model"].FirstOrDefault();

            var result = await _authService.AuthenticateOrRegisterAsync(request, ipAddress, userAgent, platformVersion, deviceModel);
            SetTokenCookies(result.AccessToken, result.RefreshToken);

            var user = await userRepository.GetByEmailAsync(request.Email);

            return Ok(new 
            { 
                HasName = result.HasName,
                User = user == null ? null : new
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    ProfilePictureUrl = user.ProfilePictureUrl,
                    Balance = user.Balance
                }
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
            ClearTokenCookies();
            return Unauthorized(new { Message = "No refresh token provided." });
        }
        try
        {
            var ipAddress = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim()
                            ?? HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers["User-Agent"].ToString();
            var platformVersion = Request.Headers["Sec-CH-UA-Platform-Version"].FirstOrDefault()
                                  ?? Request.Headers["X-Platform-Version"].FirstOrDefault();
            var deviceModel = Request.Headers["Sec-CH-UA-Model"].FirstOrDefault()
                              ?? Request.Headers["X-Device-Model"].FirstOrDefault();

            var result = await _authService.RefreshTokenAsync(refreshToken, ipAddress, userAgent, platformVersion, deviceModel);
            SetTokenCookies(result.AccessToken, result.RefreshToken);
            return Ok();
        }
        catch (UnauthorizedAccessException ex)
        {
            ClearTokenCookies();
            return Unauthorized(new { Message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    [Microsoft.AspNetCore.Authorization.Authorize]
    [HttpGet("sessions")]
    public async Task<IActionResult> GetSessions()
    {
        try
        {
            var userIdString = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
            {
                return Unauthorized();
            }

            var currentRefreshToken = Request.Cookies["refreshToken"];
            var sessions = await _authService.GetUserSessionsAsync(userId, currentRefreshToken);
            return Ok(sessions);
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    [Microsoft.AspNetCore.Authorization.Authorize]
    [HttpPost("sessions/{sessionId}/revoke")]
    public async Task<IActionResult> RevokeSession(string sessionId)
    {
        try
        {
            var userIdString = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
            {
                return Unauthorized();
            }

            var currentRefreshToken = Request.Cookies["refreshToken"];
            var success = await _authService.RevokeSessionAsync(userId, sessionId, currentRefreshToken);
            if (!success)
            {
                return NotFound(new { Message = "Session not found." });
            }

            return Ok(new { Message = "Session revoked successfully." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { Message = ex.Message });
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

            return Ok(new 
            { 
                Id = user.Id, 
                Name = user.Name,
                Email = user.Email,
                ProfilePictureUrl = user.ProfilePictureUrl,
                Balance = user.Balance
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    [Microsoft.AspNetCore.Authorization.Authorize]
    [HttpPost("profile/picture")]
    public async Task<IActionResult> UploadProfilePicture(
        IFormFile file,
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
                return NotFound(new { message = "User not found." });
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "File not selected." });
            }

            if (file.Length > MaxAvatarSizeBytes)
            {
                return BadRequest(new { message = "File exceeds 10 MB limit." });
            }

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedAvatarExtensions.Contains(ext))
            {
                return BadRequest(new { message = "Allowed formats: PNG, JPG, JPEG." });
            }

            await using var inputStream = file.OpenReadStream();
            using var image = await Image.LoadAsync(inputStream);

            image.Mutate(x => x.Resize(image.Width / 2, image.Height / 2));

            await using var outputStream = new MemoryStream();
            var encoder = new WebpEncoder { Quality = 50 };
            await image.SaveAsync(outputStream, encoder);
            outputStream.Position = 0;

            var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL");
            var serviceKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY");

            var storagePath = $"profile/{userId}.webp";

            var client = _httpClientFactory.CreateClient("supabase");
            client.DefaultRequestHeaders.Clear();
            client.DefaultRequestHeaders.Add("apikey", serviceKey);
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {serviceKey}");

            var content = new StreamContent(outputStream);
            content.Headers.ContentType = new MediaTypeHeaderValue("image/webp");

            var request = new HttpRequestMessage(HttpMethod.Post, $"{supabaseUrl}/storage/v1/object/public-files/{storagePath}")
            {
                Content = content
            };
            request.Headers.Add("x-upsert", "true");

            var response = await client.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                try
                {
                    var createBucketBody = JsonSerializer.Serialize(new
                    {
                        id = "public-files",
                        name = "public-files",
                        @public = true
                    });
                    var createRequest = new HttpRequestMessage(HttpMethod.Post, $"{supabaseUrl}/storage/v1/bucket")
                    {
                        Content = new StringContent(createBucketBody, Encoding.UTF8, "application/json")
                    };
                    await client.SendAsync(createRequest);
                }
                catch { }

                outputStream.Position = 0;
                var retryContent = new StreamContent(outputStream);
                retryContent.Headers.ContentType = new MediaTypeHeaderValue("image/webp");

                var retryRequest = new HttpRequestMessage(HttpMethod.Post, $"{supabaseUrl}/storage/v1/object/public-files/{storagePath}")
                {
                    Content = retryContent
                };
                retryRequest.Headers.Add("x-upsert", "true");
                response = await client.SendAsync(retryRequest);

                if (!response.IsSuccessStatusCode)
                {
                    var err = await response.Content.ReadAsStringAsync();
                    return StatusCode(500, new { message = $"Supabase upload error: {err}" });
                }
            }

            var publicUrl = $"{supabaseUrl}/storage/v1/object/public/public-files/{storagePath}?v={DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
            user.ProfilePictureUrl = publicUrl;
            await userRepository.UpdateAsync(user);

            return Ok(new
            {
                profilePictureUrl = publicUrl,
                sizeKb = Math.Round(outputStream.Length / 1024.0, 1)
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Microsoft.AspNetCore.Authorization.Authorize]
    [HttpDelete("profile/picture")]
    public async Task<IActionResult> DeleteProfilePicture([FromServices] IUserRepository userRepository)
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
                return NotFound(new { message = "User not found." });
            }

            var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL");
            var serviceKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY");

            var client = _httpClientFactory.CreateClient("supabase");
            client.DefaultRequestHeaders.Clear();
            client.DefaultRequestHeaders.Add("apikey", serviceKey);
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {serviceKey}");

            var storagePath = $"profile/{userId}.webp";
            var body = JsonSerializer.Serialize(new { prefixes = new[] { storagePath } });
            var request = new HttpRequestMessage(HttpMethod.Delete, $"{supabaseUrl}/storage/v1/object/public-files")
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json")
            };

            await client.SendAsync(request);

            user.ProfilePictureUrl = null;
            await userRepository.UpdateAsync(user);

            return Ok(new { message = "Profile picture deleted." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
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

            return Ok(new
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                ProfilePictureUrl = user.ProfilePictureUrl,
                Balance = user.Balance
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = ex.Message });
        }
    }

    [Microsoft.AspNetCore.Authorization.Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequest request,
        [FromServices] IUserRepository userRepository)
    {
        try
        {
            var userIdString = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
            {
                return Unauthorized();
            }

            if (string.IsNullOrWhiteSpace(request.CurrentPassword) ||
                string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return BadRequest(new { message = "All password fields are required." });
            }

            if (request.NewPassword.Length < 6)
            {
                return BadRequest(new { message = "New password must be at least 6 characters long." });
            }

            if (!string.IsNullOrEmpty(request.ConfirmPassword) && request.NewPassword != request.ConfirmPassword)
            {
                return BadRequest(new { message = "New password and confirmation do not match." });
            }

            var user = await userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            {
                return BadRequest(new { message = "Current password is incorrect." });
            }

            if (BCrypt.Net.BCrypt.Verify(request.NewPassword, user.PasswordHash))
            {
                return BadRequest(new { message = "New password cannot be the same as the current password." });
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            await userRepository.UpdateAsync(user);

            return Ok(new { message = "Password updated successfully." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
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
    [HttpGet("promos")]
    public async Task<IActionResult> GetAllPromos([FromServices] IUserRepository userRepository)
    {
        try
        {
            var userIdString = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
                return Unauthorized();

            var promos = await userRepository.GetAllUserPromosAsync(userId);
            var now = DateTime.UtcNow;

            var list = promos.Select(promo =>
            {
                bool isExpired = promo.Dates.ExpiresAt < now;
                return new
                {
                    id = promo.Id,
                    promoCode = promo.Codes.PromoCode,
                    barCode = promo.Codes.BarCode,
                    prizeName = promo.PrizeInfo.PrizeName,
                    prizeDescription = promo.PrizeInfo.PrizeDescription,
                    prizeType = promo.PrizeInfo.Type.ToString(),
                    cashbackPercent = promo.PrizeInfo.CashbackPercent,
                    isActive = promo.IsActive && !isExpired,
                    isExpired = isExpired,
                    activatedAt = promo.Dates.ActivatedAt,
                    expiresAt = promo.Dates.ExpiresAt
                };
            }).ToList();

            return Ok(list);
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
        ClearTokenCookies();
        return Ok();
    }

    private void ClearTokenCookies()
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Path = "/"
        };
        Response.Cookies.Delete("accessToken", cookieOptions);
        Response.Cookies.Delete("refreshToken", cookieOptions);
    }

    private void SetTokenCookies(string accessToken, string refreshToken)
    {
        var accessCookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Path = "/",
            Expires = DateTime.UtcNow.AddMinutes(15)
        };

        var refreshCookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Path = "/",
            Expires = DateTime.UtcNow.AddDays(15)
        };

        Response.Cookies.Append("accessToken", accessToken, accessCookieOptions);
        Response.Cookies.Append("refreshToken", refreshToken, refreshCookieOptions);
    }
}
