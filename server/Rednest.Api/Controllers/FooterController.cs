using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rednest.Infrastructure.Data;

namespace Rednest.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FooterController : ControllerBase
{
    private readonly AppDbContext _db;

    public FooterController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> Get([FromQuery] string? lang = null)
    {
        var footer = await _db.Footers.AsNoTracking().FirstOrDefaultAsync();
        if (footer == null)
            return NotFound();

        var normalizedLang = (lang ?? "ru").Trim().ToLowerInvariant();
        var activeContent = normalizedLang switch
        {
            "en" => footer.FooterEN,
            "az" => footer.FooterAZ,
            _ => footer.FooterRU
        };

        return Ok(new
        {
            updatedAt = footer.UpdatedAt,
            language = normalizedLang,
            content = activeContent,
            footerRU = footer.FooterRU,
            footerEN = footer.FooterEN,
            footerAZ = footer.FooterAZ
        });
    }
}
