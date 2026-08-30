using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Rednest.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ConvertImageUrlToImagesJson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            const string supabaseBase = "https://tlcehlxztgewbidcvwye.supabase.co/storage/v1/object/public/admin-files/database/";

            migrationBuilder.AddColumn<string>(
                name: "Images",
                table: "Products",
                type: "jsonb",
                nullable: false,
                defaultValue: "{}");

            // Migrate existing ImageUrl data → Images.Image, and set known Icon URLs per product ID
            migrationBuilder.Sql($@"
                UPDATE ""Products"" SET ""Images"" = jsonb_build_object(
                    'Image', COALESCE(""ImageUrl"", ''),
                    'Icon', CASE ""Id""::text
                        WHEN 'a1b2c3d4-0001-0001-0001-000000000001' THEN '{supabaseBase}tea_1787566950.webp'
                        WHEN 'a1b2c3d4-0001-0001-0001-000000000002' THEN '{supabaseBase}espresso_1787567143.webp'
                        WHEN 'a1b2c3d4-0001-0001-0001-000000000003' THEN '{supabaseBase}americano_1787567136.webp'
                        WHEN 'a1b2c3d4-0001-0001-0001-000000000004' THEN '{supabaseBase}latte_1787567130.webp'
                        WHEN 'a1b2c3d4-0001-0001-0001-000000000005' THEN '{supabaseBase}cappuccino_1787567169.webp'
                        WHEN 'a1b2c3d4-0002-0002-0002-000000000001' THEN '{supabaseBase}red_latte_1787567174.webp'
                        WHEN 'a1b2c3d4-0002-0002-0002-000000000002' THEN '{supabaseBase}nest_cappuccino_9876543290_1787567162.webp'
                        WHEN 'a1b2c3d4-0002-0002-0002-000000000003' THEN '{supabaseBase}hot_chocolate_1787567158.webp'
                        WHEN 'a1b2c3d4-0003-0003-0003-000000000001' THEN '{supabaseBase}eclair_1787567148.webp'
                        WHEN 'a1b2c3d4-0003-0003-0003-000000000002' THEN '{supabaseBase}croissant_1787567119.webp'
                        WHEN 'a1b2c3d4-0003-0003-0003-000000000003' THEN '{supabaseBase}muffin_1787567178.webp'
                        ELSE ''
                    END
                )
            ");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "Products");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Images",
                table: "Products");

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "Products",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
