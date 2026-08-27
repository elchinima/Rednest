using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rednest.Application.DTOs;
using Rednest.Application.Interfaces;
using Rednest.Core.Entities;
using System.Security.Claims;
using System.Text.RegularExpressions;

namespace Rednest.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/payment-methods")]
[Route("api/paymentmethods")]
public class PaymentMethodsController : ControllerBase
{
    private readonly IUserRepository _userRepository;

    public PaymentMethodsController(IUserRepository userRepository)
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

    private static string DetectCardBrand(string cleanNumber)
    {
        if (cleanNumber.StartsWith('4'))
        {
            return "Visa";
        }

        if (cleanNumber.Length >= 2)
        {
            var firstTwo = int.Parse(cleanNumber[..2]);
            if (firstTwo >= 51 && firstTwo <= 55)
            {
                return "Mastercard";
            }
        }

        if (cleanNumber.Length >= 4)
        {
            var firstFour = int.Parse(cleanNumber[..4]);
            if (firstFour >= 2221 && firstFour <= 2720)
            {
                return "Mastercard";
            }
        }

        return string.Empty;
    }

    private static bool IsValidLuhn(string number)
    {
        int sum = 0;
        bool alternate = false;
        for (int i = number.Length - 1; i >= 0; i--)
        {
            if (!char.IsDigit(number[i])) return false;
            int n = number[i] - '0';
            if (alternate)
            {
                n *= 2;
                if (n > 9) n -= 9;
            }
            sum += n;
            alternate = !alternate;
        }
        return sum % 10 == 0;
    }

    private static bool IsValidExpiry(string expiryDate)
    {
        if (string.IsNullOrWhiteSpace(expiryDate)) return false;
        var parts = expiryDate.Trim().Split('/');
        if (parts.Length != 2) return false;

        if (!int.TryParse(parts[0].Trim(), out int month) || month < 1 || month > 12)
            return false;

        if (!int.TryParse(parts[1].Trim(), out int year))
            return false;

        int fullYear = year < 100 ? 2000 + year : year;
        var now = GetBakuTime();
        var currentYear = now.Year;
        var currentMonth = now.Month;

        if (fullYear < currentYear) return false;
        if (fullYear == currentYear && month < currentMonth) return false;
        if (fullYear > currentYear + 25) return false;

        return true;
    }

    [HttpGet]
    public async Task<IActionResult> GetPaymentMethods()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var user = await _userRepository.GetByIdAsync(userId.Value);
        if (user == null) return NotFound(new { message = "User not found." });

        var cards = user.PaymentMethods ?? new List<UserPaymentMethod>();

        var ordered = cards
            .OrderByDescending(c => c.IsDefault)
            .ThenByDescending(c => c.CreatedAt)
            .Select(c =>
            {
                var digits = Regex.Replace(c.CardNumber ?? string.Empty, @"\D", "");
                var last4 = digits.Length >= 4 ? digits[^4..] : digits;
                var masked = digits.Length >= 4 ? $"•••• •••• •••• {last4}" : c.CardNumber;
                var brand = !string.IsNullOrWhiteSpace(c.CardBrand) ? c.CardBrand : DetectCardBrand(digits);

                return new
                {
                    c.Id,
                    c.CardName,
                    c.CardholderName,
                    CardNumber = masked,
                    Last4 = last4,
                    CardBrand = brand,
                    c.ExpiryDate,
                    c.IsDefault,
                    c.CreatedAt
                };
            })
            .ToList();

        return Ok(ordered);
    }

    [HttpPost]
    public async Task<IActionResult> AddPaymentMethod([FromBody] PaymentMethodRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.CardNumber))
        {
            return BadRequest(new { message = "Card number is required." });
        }

        var cleanNumber = Regex.Replace(request.CardNumber, @"\D", "");
        if (cleanNumber.Length < 13 || cleanNumber.Length > 19)
        {
            return BadRequest(new { message = "Card number must be 16 digits." });
        }

        var brand = DetectCardBrand(cleanNumber);
        if (string.IsNullOrEmpty(brand))
        {
            return BadRequest(new { message = "Only Visa and Mastercard cards are supported." });
        }

        if (!IsValidLuhn(cleanNumber))
        {
            return BadRequest(new { message = "Invalid card number checksum (Luhn check failed)." });
        }

        if (string.IsNullOrWhiteSpace(request.ExpiryDate) || !IsValidExpiry(request.ExpiryDate))
        {
            return BadRequest(new { message = "Invalid or expired expiration date (format: MM/YY)." });
        }

        var cleanCvc = Regex.Replace(request.Cvc ?? string.Empty, @"\D", "");
        if (cleanCvc.Length != 3)
        {
            return BadRequest(new { message = "CVC code must be exactly 3 digits." });
        }

        var user = await _userRepository.GetByIdAsync(userId.Value);
        if (user == null) return NotFound(new { message = "User not found." });

        user.PaymentMethods ??= new List<UserPaymentMethod>();

        var existingCard = user.PaymentMethods.FirstOrDefault(c =>
            Regex.Replace(c.CardNumber ?? "", @"\D", "") == cleanNumber);
        if (existingCard != null)
        {
            return BadRequest(new { message = "This card is already added to your account." });
        }

        var nextId = user.PaymentMethods.Count > 0 ? user.PaymentMethods.Max(c => c.Id) + 1 : 1;
        var isFirst = user.PaymentMethods.Count == 0;
        var shouldBeDefault = request.IsDefault || isFirst;

        if (shouldBeDefault)
        {
            foreach (var card in user.PaymentMethods)
            {
                card.IsDefault = false;
            }
        }

        var formattedExpiry = request.ExpiryDate.Trim();
        var cardholder = string.IsNullOrWhiteSpace(request.CardholderName)
            ? (user.Name ?? "Cardholder")
            : request.CardholderName.Trim().ToUpperInvariant();

        var newCard = new UserPaymentMethod
        {
            Id = nextId,
            CardName = string.IsNullOrWhiteSpace(request.CardName) ? $"{brand} Card" : request.CardName.Trim(),
            CardholderName = cardholder,
            CardNumber = cleanNumber,
            ExpiryDate = formattedExpiry,
            Cvc = cleanCvc,
            CardBrand = brand,
            IsDefault = shouldBeDefault,
            CreatedAt = GetBakuTime()
        };

        user.PaymentMethods.Add(newCard);
        await _userRepository.UpdateAsync(user);

        var last4 = cleanNumber.Length >= 4 ? cleanNumber[^4..] : cleanNumber;
        return Ok(new
        {
            newCard.Id,
            newCard.CardName,
            newCard.CardholderName,
            CardNumber = $"•••• •••• •••• {last4}",
            Last4 = last4,
            CardBrand = brand,
            newCard.ExpiryDate,
            newCard.IsDefault,
            newCard.CreatedAt
        });
    }

    [HttpPatch("{id:int}/default")]
    [HttpPost("{id:int}/default")]
    public async Task<IActionResult> SetDefaultPaymentMethod(int id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var user = await _userRepository.GetByIdAsync(userId.Value);
        if (user == null) return NotFound(new { message = "User not found." });

        user.PaymentMethods ??= new List<UserPaymentMethod>();
        var target = user.PaymentMethods.FirstOrDefault(c => c.Id == id);
        if (target == null) return NotFound(new { message = "Payment method not found." });

        foreach (var card in user.PaymentMethods)
        {
            card.IsDefault = (card.Id == id);
        }

        await _userRepository.UpdateAsync(user);

        return Ok(new { message = "Default payment method updated successfully.", id });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeletePaymentMethod(int id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var user = await _userRepository.GetByIdAsync(userId.Value);
        if (user == null) return NotFound(new { message = "User not found." });

        user.PaymentMethods ??= new List<UserPaymentMethod>();
        var target = user.PaymentMethods.FirstOrDefault(c => c.Id == id);
        if (target == null) return NotFound(new { message = "Payment method not found." });

        var wasDefault = target.IsDefault;
        user.PaymentMethods.Remove(target);

        if (wasDefault && user.PaymentMethods.Count > 0)
        {
            user.PaymentMethods[0].IsDefault = true;
        }

        await _userRepository.UpdateAsync(user);

        return Ok(new { message = "Payment method removed successfully.", id });
    }
}
