using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Rednest.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ConvertProductPriceToPricesJson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Prices",
                table: "Products",
                type: "jsonb",
                nullable: false,
                defaultValue: "{}");

            migrationBuilder.Sql(@"
                UPDATE ""Products"" 
                SET ""Prices"" = jsonb_build_object(
                    'Price', COALESCE(""Price"", 0),
                    'DiscountPrice', null
                );
            ");

            migrationBuilder.DropColumn(
                name: "Price",
                table: "Products");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Price",
                table: "Products",
                type: "numeric(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.Sql(@"
                UPDATE ""Products""
                SET ""Price"" = COALESCE((""Prices""->>'Price')::numeric, 0);
            ");

            migrationBuilder.DropColumn(
                name: "Prices",
                table: "Products");
        }
    }
}
