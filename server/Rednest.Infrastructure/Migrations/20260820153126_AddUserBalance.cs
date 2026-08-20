using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Rednest.Infrastructure.Migrations
{
    public partial class AddUserBalance : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Balance",
                table: "Users",
                type: "numeric(10,2)",
                nullable: false,
                defaultValue: 0.00m);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Balance",
                table: "Users");
        }
    }
}
