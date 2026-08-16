using Microsoft.EntityFrameworkCore;
using Rednest.Core.Entities;

namespace Rednest.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();
    public DbSet<UserPromo> UserPromos => Set<UserPromo>();
    public DbSet<Product> Products => Set<Product>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();

            entity.Property(e => e.ProfilePictureUrl)
                  .HasColumnType("text");

            entity.HasOne(e => e.Session)
                  .WithOne(s => s.User)
                  .HasForeignKey<UserSession>(s => s.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserSession>(entity =>
        {
            entity.HasKey(e => e.UserId);

            entity.Property(e => e.Sessions)
                  .HasColumnType("jsonb");
        });

        modelBuilder.Entity<UserPromo>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Codes).HasColumnType("jsonb");
            entity.Property(e => e.PrizeInfo).HasColumnType("jsonb");
            entity.Property(e => e.Dates).HasColumnType("jsonb");

            entity.HasOne(e => e.User)
                  .WithMany(u => u.Promos)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Price).HasColumnType("decimal(10,2)");
            entity.Property(e => e.ImageUrl).IsRequired().HasColumnType("text");
            entity.Property(e => e.Category).IsRequired().HasMaxLength(50);
        });

        SeedProducts(modelBuilder);
    }

    private static void SeedProducts(ModelBuilder modelBuilder)
    {
        const string baseUrl = "https://tlcehlxztgewbidcvwye.supabase.co/storage/v1/object/public/admin-files/database";

        modelBuilder.Entity<Product>().HasData(
            new Product
            {
                Id = Guid.Parse("a1b2c3d4-0001-0001-0001-000000000001"),
                Name = "Tea",
                Description = "Quenches thirst, invigorates, and is an ideal choice for relaxation.",
                Price = 1.49m,
                ImageUrl = $"{baseUrl}/tea_7654329000.webp",
                Category = "Main Drinks"
            },
            new Product
            {
                Id = Guid.Parse("a1b2c3d4-0001-0001-0001-000000000002"),
                Name = "Espresso",
                Description = "A perfect choice to start the day energetically with its thick and strong taste. A favorite of true coffee lovers.",
                Price = 2.89m,
                ImageUrl = $"{baseUrl}/espresso_6854930222.webp",
                Category = "Main Drinks"
            },
            new Product
            {
                Id = Guid.Parse("a1b2c3d4-0001-0001-0001-000000000003"),
                Name = "Americano",
                Description = "A light and delicate flavor. Prepared by adding water to espresso, its taste is simple yet classic.",
                Price = 2.89m,
                ImageUrl = $"{baseUrl}/americano_1786885347.webp",
                Category = "Main Drinks"
            },
            new Product
            {
                Id = Guid.Parse("a1b2c3d4-0001-0001-0001-000000000004"),
                Name = "Latte",
                Description = "Soft espresso mixed with fine milk foam. For those who love a warm and delicate taste.",
                Price = 3.49m,
                ImageUrl = $"{baseUrl}/latte_6543223589.webp",
                Category = "Main Drinks"
            },
            new Product
            {
                Id = Guid.Parse("a1b2c3d4-0001-0001-0001-000000000005"),
                Name = "Cappuccino",
                Description = "The perfect balance of coffee and milk foam. The soft foam on top brings happiness with every sip.",
                Price = 3.49m,
                ImageUrl = $"{baseUrl}/cappuccino_8765432354.webp",
                Category = "Main Drinks"
            },
            new Product
            {
                Id = Guid.Parse("a1b2c3d4-0002-0002-0002-000000000001"),
                Name = "Red Latte",
                Description = "Special Rednest recipe: The harmony of latte and strawberry syrup. A sweet and romantic taste.",
                Price = 3.75m,
                ImageUrl = $"{baseUrl}/red_latte_9876543221.webp",
                Category = "Specialty Drinks"
            },
            new Product
            {
                Id = Guid.Parse("a1b2c3d4-0002-0002-0002-000000000002"),
                Name = "Nest Cappuccino",
                Description = "Cappuccino enriched with the sweetness of caramel and the aroma of hazelnut. Like a warm hug.",
                Price = 4.25m,
                ImageUrl = $"{baseUrl}/nest_cappuccino_9876543290.webp",
                Category = "Specialty Drinks"
            },
            new Product
            {
                Id = Guid.Parse("a1b2c3d4-0002-0002-0002-000000000003"),
                Name = "Hot Chocolate",
                Description = "A drink that warms your soul with the aroma and softness of thick chocolate. A taste that brings back childhood memories.",
                Price = 3.99m,
                ImageUrl = $"{baseUrl}/hot_chocolate_7690568000.webp",
                Category = "Specialty Drinks"
            },
            new Product
            {
                Id = Guid.Parse("a1b2c3d4-0003-0003-0003-000000000001"),
                Name = "Eclair",
                Description = "A delicate pastry dessert filled with fragrant cream and covered with a fine layer. Every bite brings a light sweetness and pleasant taste.",
                Price = 2.25m,
                ImageUrl = $"{baseUrl}/eclair_8439200222.webp",
                Category = "Desserts"
            },
            new Product
            {
                Id = Guid.Parse("a1b2c3d4-0003-0003-0003-000000000002"),
                Name = "Croissant",
                Description = "An unforgettable French classic with butter and taste in a light, flaky pastry.",
                Price = 1.99m,
                ImageUrl = $"{baseUrl}/croissant_7654320922.webp",
                Category = "Desserts"
            },
            new Product
            {
                Id = Guid.Parse("a1b2c3d4-0003-0003-0003-000000000003"),
                Name = "Muffin",
                Description = "Soft, sweet, and satisfying. The best companion to every cup of coffee.",
                Price = 1.59m,
                ImageUrl = $"{baseUrl}/muffin_7965430339.webp",
                Category = "Desserts"
            }
        );
    }
}

