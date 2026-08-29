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
    public DbSet<Review> Reviews => Set<Review>();

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

            entity.Property(e => e.PaymentMethods)
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

            entity.Property(e => e.TwoFactorEnabled)
                  .HasColumnName("2FA")
                  .HasDefaultValue(false);

            entity.Property(e => e.Subscribe)
                  .HasColumnName("Subscribe")
                  .HasDefaultValue(false);

            entity.Property(e => e.IsActive)
                  .HasColumnName("IsActive")
                  .HasDefaultValue(true);

            entity.Property(e => e.AccountVerify)
                  .HasColumnName("AccountVerify")
                  .HasColumnType("jsonb")
                  .HasDefaultValueSql("'[]'::jsonb");

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
            entity.HasIndex(e => e.UserId);

            entity.Property(e => e.Status).HasColumnType("text");
            entity.Property(e => e.CreatedAt).HasColumnType("timestamp with time zone");
            entity.Property(e => e.Items).HasColumnType("jsonb");
            entity.Property(e => e.Payment).HasColumnType("jsonb");
            entity.Property(e => e.Notes)
                  .HasColumnType("jsonb")
                  .HasDefaultValueSql("'{}'::jsonb");

            entity.HasOne<User>()
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Review>(entity =>
        {
            entity.ToTable("Reviews");
            entity.HasKey(e => e.Id);

            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.OrderId).IsUnique();

            entity.Property(e => e.Category)
                  .HasConversion<string>()
                  .HasColumnType("text");

            entity.Property(e => e.Status)
                  .HasConversion<string>()
                  .HasColumnType("text")
                  .HasDefaultValue(ReviewStatus.Published);

            entity.Property(e => e.ReviewData)
                  .HasColumnName("Review")
                  .HasColumnType("jsonb")
                  .HasDefaultValueSql("'{}'::jsonb");

            entity.Property(e => e.Likes)
                  .HasColumnName("Likes")
                  .HasColumnType("jsonb")
                  .HasDefaultValueSql("'[]'::jsonb");

            entity.Property(e => e.CreatedAt)
                  .HasColumnType("timestamp with time zone")
                  .HasDefaultValueSql("NOW()");

            entity.HasOne<User>()
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne<Order>()
                  .WithMany()
                  .HasForeignKey(e => e.OrderId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
