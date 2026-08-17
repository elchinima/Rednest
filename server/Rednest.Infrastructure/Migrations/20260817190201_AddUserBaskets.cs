using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Rednest.Core.Entities;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Rednest.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUserBaskets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "Id",
                keyValue: new Guid("a1b2c3d4-0001-0001-0001-000000000001"));

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "Id",
                keyValue: new Guid("a1b2c3d4-0001-0001-0001-000000000002"));

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "Id",
                keyValue: new Guid("a1b2c3d4-0001-0001-0001-000000000003"));

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "Id",
                keyValue: new Guid("a1b2c3d4-0001-0001-0001-000000000004"));

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "Id",
                keyValue: new Guid("a1b2c3d4-0001-0001-0001-000000000005"));

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "Id",
                keyValue: new Guid("a1b2c3d4-0002-0002-0002-000000000001"));

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "Id",
                keyValue: new Guid("a1b2c3d4-0002-0002-0002-000000000002"));

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "Id",
                keyValue: new Guid("a1b2c3d4-0002-0002-0002-000000000003"));

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "Id",
                keyValue: new Guid("a1b2c3d4-0003-0003-0003-000000000001"));

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "Id",
                keyValue: new Guid("a1b2c3d4-0003-0003-0003-000000000002"));

            migrationBuilder.DeleteData(
                table: "Products",
                keyColumn: "Id",
                keyValue: new Guid("a1b2c3d4-0003-0003-0003-000000000003"));

            migrationBuilder.CreateTable(
                name: "UserBaskets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Items = table.Column<List<BasketItem>>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserBaskets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserBaskets_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserBaskets_UserId",
                table: "UserBaskets",
                column: "UserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserBaskets");

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
    }
}
