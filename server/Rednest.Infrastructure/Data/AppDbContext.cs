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
    public DbSet<AdminLog> AdminLogs => Set<AdminLog>();

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

            entity.Property(e => e.Role)
                  .HasConversion<string>()
                  .HasColumnType("text")
                  .HasDefaultValue(UserRole.Customer);

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
            entity.Property(e => e.Category).IsRequired().HasMaxLength(50);
            entity.Property(e => e.IsActive).HasDefaultValue(true);

            entity.OwnsOne(e => e.Prices, p =>
            {
                p.ToJson("Prices");
            });

            entity.OwnsOne(e => e.Images, img =>
            {
                img.ToJson("Images");
            });
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

            entity.OwnsOne(e => e.Status, status =>
            {
                status.ToJson();
                status.Property(s => s.Status).HasConversion<string>();
            });

            entity.Property(e => e.Language)
                  .HasConversion<string>()
                  .HasColumnType("text")
                  .IsRequired(false);

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

        modelBuilder.Entity<AdminLog>(entity =>
        {
            entity.ToTable("AdminLogs");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Role).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Page).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Type).IsRequired().HasMaxLength(50);

            entity.Property(e => e.Description)
                  .HasColumnType("jsonb")
                  .HasDefaultValueSql("'{}'::jsonb");

            entity.Property(e => e.CreatedAt)
                  .HasColumnType("timestamp with time zone")
                  .HasDefaultValueSql("NOW()");

            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
