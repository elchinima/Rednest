using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Rednest.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateUserPromosPK : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_UserPromos",
                table: "UserPromos");

            migrationBuilder.DropIndex(
                name: "IX_UserPromos_UserId",
                table: "UserPromos");

            migrationBuilder.DropColumn(
                name: "Id",
                table: "UserPromos");

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserPromos",
                table: "UserPromos",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_UserPromos",
                table: "UserPromos");

            migrationBuilder.AddColumn<Guid>(
                name: "Id",
                table: "UserPromos",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserPromos",
                table: "UserPromos",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_UserPromos_UserId",
                table: "UserPromos",
                column: "UserId");
        }
    }
}
