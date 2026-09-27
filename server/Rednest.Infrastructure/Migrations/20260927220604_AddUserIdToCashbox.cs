using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Rednest.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUserIdToCashbox : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "Cashbox",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Cashbox_UserId",
                table: "Cashbox",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Cashbox_Users_UserId",
                table: "Cashbox",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.Sql(@"UPDATE ""Cashbox"" SET ""UserId"" = (""Description""->>'CashierId')::uuid WHERE ""Description""->>'CashierId' IS NOT NULL AND ""Description""->>'CashierId' <> '';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Cashbox_Users_UserId",
                table: "Cashbox");

            migrationBuilder.DropIndex(
                name: "IX_Cashbox_UserId",
                table: "Cashbox");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Cashbox");
        }
    }
}
