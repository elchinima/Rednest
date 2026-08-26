using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rednest.Application.DTOs;
using Rednest.Application.Interfaces;
using Rednest.Core.Entities;
using System.Security.Claims;

namespace Rednest.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
[Route("api/adresses")]
public class AddressesController : ControllerBase
{
    private readonly IUserRepository _userRepository;

    public AddressesController(IUserRepository userRepository)
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
    public async Task<IActionResult> GetAddresses()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var user = await _userRepository.GetByIdAsync(userId.Value);
        if (user == null) return NotFound(new { message = "User not found." });

        var addresses = user.Addresses ?? new List<UserAddress>();

        var ordered = addresses
            .OrderByDescending(a => a.IsDefault)
            .ThenByDescending(a => a.CreatedAt)
            .ToList();

        return Ok(ordered);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetAddressById(int id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var user = await _userRepository.GetByIdAsync(userId.Value);
        if (user == null) return NotFound(new { message = "User not found." });

        var address = user.Addresses?.FirstOrDefault(a => a.Id == id);
        if (address == null) return NotFound(new { message = "Address not found." });

        return Ok(address);
    }

    [HttpPost]
    public async Task<IActionResult> CreateAddress([FromBody] AddressRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Address))
        {
            return BadRequest(new { message = "Address line is required." });
        }

        if (string.IsNullOrWhiteSpace(request.City))
        {
            return BadRequest(new { message = "City is required." });
        }

        if (string.IsNullOrWhiteSpace(request.Phone))
        {
            return BadRequest(new { message = "Contact phone number is required." });
        }

        var user = await _userRepository.GetByIdAsync(userId.Value);
        if (user == null) return NotFound(new { message = "User not found." });

        user.Addresses ??= new List<UserAddress>();

        var nextId = user.Addresses.Count > 0 ? user.Addresses.Max(a => a.Id) + 1 : 1;
        var isFirst = user.Addresses.Count == 0;
        var shouldBeDefault = request.IsDefault || isFirst;

        if (shouldBeDefault)
        {
            foreach (var addr in user.Addresses)
            {
                addr.IsDefault = false;
            }
        }

        var newAddress = new UserAddress
        {
            Id = nextId,
            Title = string.IsNullOrWhiteSpace(request.Title) ? "Home" : request.Title.Trim(),
            Address = request.Address.Trim(),
            City = request.City.Trim(),
            Apartment = string.IsNullOrWhiteSpace(request.Apartment) ? null : request.Apartment.Trim(),
            Phone = request.Phone.Trim(),
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            IsDefault = shouldBeDefault,
            CreatedAt = GetBakuTime()
        };

        user.Addresses.Add(newAddress);
        await _userRepository.UpdateAsync(user);

        return Ok(newAddress);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateAddress(int id, [FromBody] AddressRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Address))
        {
            return BadRequest(new { message = "Address line is required." });
        }

        if (string.IsNullOrWhiteSpace(request.City))
        {
            return BadRequest(new { message = "City is required." });
        }

        if (string.IsNullOrWhiteSpace(request.Phone))
        {
            return BadRequest(new { message = "Contact phone number is required." });
        }

        var user = await _userRepository.GetByIdAsync(userId.Value);
        if (user == null) return NotFound(new { message = "User not found." });

        user.Addresses ??= new List<UserAddress>();
        var target = user.Addresses.FirstOrDefault(a => a.Id == id);
        if (target == null) return NotFound(new { message = "Address not found." });

        if (request.IsDefault)
        {
            foreach (var addr in user.Addresses)
            {
                addr.IsDefault = false;
            }
            target.IsDefault = true;
        }
        else
        {
            target.IsDefault = false;
            if (!user.Addresses.Any(a => a.IsDefault))
            {
                var firstOther = user.Addresses.FirstOrDefault(a => a.Id != id);
                if (firstOther != null)
                {
                    firstOther.IsDefault = true;
                }
                else
                {
                    target.IsDefault = true;
                }
            }
        }

        target.Title = string.IsNullOrWhiteSpace(request.Title) ? "Home" : request.Title.Trim();
        target.Address = request.Address.Trim();
        target.City = request.City.Trim();
        target.Apartment = string.IsNullOrWhiteSpace(request.Apartment) ? null : request.Apartment.Trim();
        target.Phone = request.Phone.Trim();
        target.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();

        await _userRepository.UpdateAsync(user);

        return Ok(target);
    }

    [HttpPatch("{id:int}/default")]
    [HttpPost("{id:int}/default")]
    public async Task<IActionResult> SetDefaultAddress(int id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var user = await _userRepository.GetByIdAsync(userId.Value);
        if (user == null) return NotFound(new { message = "User not found." });

        user.Addresses ??= new List<UserAddress>();
        var target = user.Addresses.FirstOrDefault(a => a.Id == id);
        if (target == null) return NotFound(new { message = "Address not found." });

        foreach (var addr in user.Addresses)
        {
            addr.IsDefault = (addr.Id == id);
        }

        await _userRepository.UpdateAsync(user);

        return Ok(target);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteAddress(int id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var user = await _userRepository.GetByIdAsync(userId.Value);
        if (user == null) return NotFound(new { message = "User not found." });

        user.Addresses ??= new List<UserAddress>();
        var target = user.Addresses.FirstOrDefault(a => a.Id == id);
        if (target == null) return NotFound(new { message = "Address not found." });

        var wasDefault = target.IsDefault;
        user.Addresses.Remove(target);

        if (wasDefault && user.Addresses.Count > 0)
        {
            user.Addresses[0].IsDefault = true;
        }

        await _userRepository.UpdateAsync(user);

        return Ok(new { message = "Address removed successfully.", id });
    }
}
