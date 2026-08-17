namespace Rednest.Core.Entities;

public class UserBasket
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public List<BasketItem> Items { get; set; } = new();
}

public class BasketItem
{
    public Guid ProductId { get; set; }
    public DateTime AddedAt { get; set; }
    public int Quantity { get; set; }
}
