
namespace Rednest.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ProductsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var products = await _db.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .OrderBy(p => p.Price)
            .ToListAsync();

        var categoryOrder = new[] { "Main Drinks", "Specialty Drinks", "Desserts" };

        var grouped = categoryOrder
            .Select(cat => new
            {
                category = cat,
                items = products
                    .Where(p => p.Category == cat)
                    .Select(p => new
                    {
                        id = p.Id,
                        name = p.Name,
                        description = p.Description,
                        price = p.Price.ToString("0.00"),
                        images = new { image = p.Images != null ? p.Images.Image : string.Empty, icon = p.Images != null ? p.Images.Icon : string.Empty },
                        category = p.Category
                    })
                    .ToList()
            })

            .Where(g => g.items.Count > 0)
            .ToList();

        return Ok(grouped);
    }

    [HttpGet("favorites")]
    public async Task<IActionResult> GetFavorites([FromQuery] int limit = 4)
    {
        var activeProducts = await _db.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .ToListAsync();

        var orders = await _db.Orders
            .AsNoTracking()
            .Select(o => o.Items)
            .ToListAsync();

        var salesCountByProduct = orders
            .Where(items => items != null)
            .SelectMany(items => items)
            .GroupBy(i => i.ProductId)
            .ToDictionary(g => g.Key, g => g.Sum(i => i.Quantity));

        var favorites = activeProducts
            .Select(p => new
            {
                id = p.Id,
                name = p.Name,
                description = p.Description,
                price = p.Price.ToString("0.00"),
                images = new { image = p.Images != null ? p.Images.Image : string.Empty, icon = p.Images != null ? p.Images.Icon : string.Empty },
                category = p.Category,
                totalSold = salesCountByProduct.TryGetValue(p.Id, out var sold) ? sold : 0
            })
            .OrderByDescending(p => p.totalSold)
            .ThenBy(p => p.name)
            .Take(limit > 0 ? limit : 4)
            .ToList();

        return Ok(favorites);
    }
}
