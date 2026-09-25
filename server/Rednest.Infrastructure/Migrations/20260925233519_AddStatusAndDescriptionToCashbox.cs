using Microsoft.EntityFrameworkCore.Migrations;
using Rednest.Core.Entities;

#nullable disable

namespace Rednest.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStatusAndDescriptionToCashbox : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<CashboxDescription>(
                name: "Description",
                table: "Cashbox",
                type: "jsonb",
                nullable: false,
                defaultValueSql: "'{\"Note\": null, \"Edited\": null}'::jsonb");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Cashbox",
                type: "text",
                nullable: false,
                defaultValue: "Success");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Description",
                table: "Cashbox");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Cashbox");
        }
    }
}
