using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Rednest.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProducts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Products",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Price = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    ImageUrl = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Products", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "Products",
                columns: new[] { "Id", "Category", "Description", "ImageUrl", "Name", "Price" },
                values: new object[,]
                {
                    { new Guid("a1b2c3d4-0001-0001-0001-000000000001"), "Main Drinks", "Quenches thirst, invigorates, and is an ideal choice for relaxation.", "https://tlcehlxztgewbidcvwye.supabase.co/storage/v1/object/public/admin-files/database/tea_7654329000.webp", "Tea", 1.49m },
                    { new Guid("a1b2c3d4-0001-0001-0001-000000000002"), "Main Drinks", "A perfect choice to start the day energetically with its thick and strong taste. A favorite of true coffee lovers.", "https://tlcehlxztgewbidcvwye.supabase.co/storage/v1/object/public/admin-files/database/espresso_6854930222.webp", "Espresso", 2.89m },
                    { new Guid("a1b2c3d4-0001-0001-0001-000000000003"), "Main Drinks", "A light and delicate flavor. Prepared by adding water to espresso, its taste is simple yet classic.", "https://tlcehlxztgewbidcvwye.supabase.co/storage/v1/object/public/admin-files/database/americano_1786885347.webp", "Americano", 2.89m },
                    { new Guid("a1b2c3d4-0001-0001-0001-000000000004"), "Main Drinks", "Soft espresso mixed with fine milk foam. For those who love a warm and delicate taste.", "https://tlcehlxztgewbidcvwye.supabase.co/storage/v1/object/public/admin-files/database/latte_6543223589.webp", "Latte", 3.49m },
                    { new Guid("a1b2c3d4-0001-0001-0001-000000000005"), "Main Drinks", "The perfect balance of coffee and milk foam. The soft foam on top brings happiness with every sip.", "https://tlcehlxztgewbidcvwye.supabase.co/storage/v1/object/public/admin-files/database/cappuccino_8765432354.webp", "Cappuccino", 3.49m },
                    { new Guid("a1b2c3d4-0002-0002-0002-000000000001"), "Specialty Drinks", "Special Rednest recipe: The harmony of latte and strawberry syrup. A sweet and romantic taste.", "https://tlcehlxztgewbidcvwye.supabase.co/storage/v1/object/public/admin-files/database/red_latte_9876543221.webp", "Red Latte", 3.75m },
                    { new Guid("a1b2c3d4-0002-0002-0002-000000000002"), "Specialty Drinks", "Cappuccino enriched with the sweetness of caramel and the aroma of hazelnut. Like a warm hug.", "https://tlcehlxztgewbidcvwye.supabase.co/storage/v1/object/public/admin-files/database/nest_cappuccino_9876543290.webp", "Nest Cappuccino", 4.25m },
                    { new Guid("a1b2c3d4-0002-0002-0002-000000000003"), "Specialty Drinks", "A drink that warms your soul with the aroma and softness of thick chocolate. A taste that brings back childhood memories.", "https://tlcehlxztgewbidcvwye.supabase.co/storage/v1/object/public/admin-files/database/hot_chocolate_7690568000.webp", "Hot Chocolate", 3.99m },
                    { new Guid("a1b2c3d4-0003-0003-0003-000000000001"), "Desserts", "A delicate pastry dessert filled with fragrant cream and covered with a fine layer. Every bite brings a light sweetness and pleasant taste.", "https://tlcehlxztgewbidcvwye.supabase.co/storage/v1/object/public/admin-files/database/eclair_8439200222.webp", "Eclair", 2.25m },
                    { new Guid("a1b2c3d4-0003-0003-0003-000000000002"), "Desserts", "An unforgettable French classic with butter and taste in a light, flaky pastry.", "https://tlcehlxztgewbidcvwye.supabase.co/storage/v1/object/public/admin-files/database/croissant_7654320922.webp", "Croissant", 1.99m },
                    { new Guid("a1b2c3d4-0003-0003-0003-000000000003"), "Desserts", "Soft, sweet, and satisfying. The best companion to every cup of coffee.", "https://tlcehlxztgewbidcvwye.supabase.co/storage/v1/object/public/admin-files/database/muffin_7965430339.webp", "Muffin", 1.59m }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Products");
        }
    }
}
