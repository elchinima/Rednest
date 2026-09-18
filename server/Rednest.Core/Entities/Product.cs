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

public class ProductName
{
    public string EN { get; set; } = string.Empty;
    public string RU { get; set; } = string.Empty;
    public string AZ { get; set; } = string.Empty;
}

public class ProductDescription
{
    public string EN { get; set; } = string.Empty;
    public string RU { get; set; } = string.Empty;
    public string AZ { get; set; } = string.Empty;
}

public class Product
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public ProductName? NameTranslations { get; set; }
    public ProductDescription? DescriptionTranslations { get; set; }
    public ProductPrices Prices { get; set; } = new();
    public ProductImages Images { get; set; } = new();
    public string Category { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}
