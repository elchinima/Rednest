
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
}
