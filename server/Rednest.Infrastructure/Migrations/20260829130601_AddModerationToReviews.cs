using Microsoft.EntityFrameworkCore.Migrations;
using Rednest.Core.Entities;

#nullable disable

namespace Rednest.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddModerationToReviews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Reviews",
                type: "text",
                nullable: false,
                defaultValue: "Pending",
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "Published");

            migrationBuilder.AddColumn<string>(
                name: "Moderation",
                table: "Reviews",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Moderation",
                table: "Reviews");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Reviews",
                type: "text",
                nullable: false,
                defaultValue: "Published",
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "Pending");
        }
    }
}
