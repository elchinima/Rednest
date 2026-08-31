namespace Rednest.Core.Entities;

public class ProductPrices
{
    public decimal Price { get; set; }
    public decimal? DiscountPrice { get; set; }
}

public class ProductImages
{
    public string Image { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
}

public class Product
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public ProductPrices Prices { get; set; } = new();
    public ProductImages Images { get; set; } = new();
    public string Category { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}
