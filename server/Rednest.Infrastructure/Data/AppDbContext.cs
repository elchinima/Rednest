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
    public DbSet<UserBasket> UserBaskets => Set<UserBasket>();
    public DbSet<Order> Orders => Set<Order>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();

            entity.Property(e => e.ProfilePictureUrl)
                  .HasColumnType("text");

            entity.Property(e => e.Balance)
                  .HasColumnType("decimal(10,2)")
                  .HasDefaultValue(0.00m);

            entity.Property(e => e.Addresses)
                  .HasColumnType("jsonb")
                  .HasDefaultValueSql("'[]'::jsonb");

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

        modelBuilder.Entity<UserBasket>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId).IsUnique();

            entity.Property(e => e.Items).HasColumnType("jsonb");

            entity.HasOne<User>()
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId).IsUnique();

            entity.Property(e => e.HasActiveOrder).HasColumnType("boolean");
            entity.Property(e => e.Orders).HasColumnType("jsonb");

            entity.HasOne<User>()
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
