using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Rednest.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UserPromosOneToMany : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_UserPromos",
                table: "UserPromos");

            migrationBuilder.AddColumn<Guid>(
                name: "Id",
                table: "UserPromos",
                type: "uuid",
                nullable: false,
                defaultValueSql: "gen_random_uuid()");

            // Assign unique IDs to existing rows
            migrationBuilder.Sql("UPDATE \"UserPromos\" SET \"Id\" = gen_random_uuid();");

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserPromos",
                table: "UserPromos",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_UserPromos_UserId",
                table: "UserPromos",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
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
    }
}
