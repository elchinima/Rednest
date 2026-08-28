namespace Rednest.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReviewsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ReviewsController(AppDbContext db)
    {
        _db = db;
    }

    private Guid? GetUserId()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
            return null;
        return userId;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var reviews = await _db.Reviews
            .AsNoTracking()
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var userIds = reviews.Select(r => r.UserId).Distinct().ToList();
        var users = await _db.Users
            .Where(u => userIds.Contains(u.Id))
            .AsNoTracking()
            .ToDictionaryAsync(u => u.Id);

        var result = reviews.Select(r =>
        {
            users.TryGetValue(r.UserId, out var user);
            var authorName = !string.IsNullOrWhiteSpace(user?.Name)
                ? user.Name.Trim().Split(' ')[0]
                : "Customer";

            return new
            {
                id = r.Id,
                userId = r.UserId,
                orderId = r.OrderId,
                author = authorName,
                initials = !string.IsNullOrEmpty(authorName) ? authorName[0].ToString().ToUpperInvariant() : "C",
                avatarUrl = user?.ProfilePictureUrl,
                category = r.Category.ToString(),
                rating = r.ReviewData.Rating,
                comment = r.ReviewData.Comment,
                createdAt = r.CreatedAt
            };
        }).ToList();

        return Ok(result);
    }

    [HttpGet("eligible-orders")]
    [Authorize]
    public async Task<IActionResult> GetEligibleOrders()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var completedOrders = await _db.Orders
            .Where(o => o.UserId == userId.Value && (o.Status == "Completed" || o.Status == "Complete"))
            .OrderByDescending(o => o.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

        var reviewedOrderIds = await _db.Reviews
            .Where(r => r.UserId == userId.Value)
            .Select(r => r.OrderId)
            .ToListAsync();

        var eligibleOrders = completedOrders
            .Where(o => !reviewedOrderIds.Contains(o.Id))
            .Select(o => new
            {
                id = o.Id,
                createdAt = o.CreatedAt,
                status = o.Status,
                totalAmount = o.Payment != null ? o.Payment.TotalAmount : 0m,
                itemsCount = o.Items != null ? o.Items.Sum(i => i.Quantity) : 0
            })
            .ToList();

        return Ok(eligibleOrders);
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] CreateReviewRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (request.Rating < 1.0m || request.Rating > 5.0m)
            return BadRequest(new { message = "Rating must be between 1.00 and 5.00." });

        if (string.IsNullOrWhiteSpace(request.Comment) || request.Comment.Trim().Length < 5)
            return BadRequest(new { message = "Comment must be at least 5 characters long." });

        if (request.Comment.Trim().Length > 300)
            return BadRequest(new { message = "Comment cannot exceed 300 characters." });

        if (!Enum.TryParse<ReviewCategory>(request.Category, true, out var categoryEnum))
            return BadRequest(new { message = "Invalid category. Allowed values: Delivery, Products, Service, Staff." });

        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == request.OrderId && o.UserId == userId.Value);
        if (order == null)
            return NotFound(new { message = "Order not found or does not belong to your account." });

        if (!order.Status.Equals("Complete", StringComparison.OrdinalIgnoreCase) &&
            !order.Status.Equals("Completed", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Reviews can only be submitted after the order status is Complete." });
        }

        var alreadyReviewed = await _db.Reviews.AnyAsync(r => r.OrderId == request.OrderId);
        if (alreadyReviewed)
            return Conflict(new { message = "You have already submitted a review for this order." });

        var review = new Review
        {
            Id = Guid.NewGuid(),
            UserId = userId.Value,
            OrderId = request.OrderId,
            Category = categoryEnum,
            ReviewData = new ReviewDetails
            {
                Rating = Math.Round(request.Rating, 2),
                Comment = request.Comment.Trim()
            },
            CreatedAt = DateTime.UtcNow
        };

        _db.Reviews.Add(review);
        await _db.SaveChangesAsync();

        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId.Value);
        var authorName = !string.IsNullOrWhiteSpace(user?.Name) ? user.Name.Trim().Split(' ')[0] : "Customer";

        return Ok(new
        {
            id = review.Id,
            userId = review.UserId,
            orderId = review.OrderId,
            author = authorName,
            initials = !string.IsNullOrEmpty(authorName) ? authorName[0].ToString().ToUpperInvariant() : "C",
            avatarUrl = user?.ProfilePictureUrl,
            category = review.Category.ToString(),
            rating = review.ReviewData.Rating,
            comment = review.ReviewData.Comment,
            createdAt = review.CreatedAt
        });
    }
}

public class CreateReviewRequest
{
    public Guid OrderId { get; set; }
    public string Category { get; set; } = null!;
    public decimal Rating { get; set; }
    public string Comment { get; set; } = null!;
}
