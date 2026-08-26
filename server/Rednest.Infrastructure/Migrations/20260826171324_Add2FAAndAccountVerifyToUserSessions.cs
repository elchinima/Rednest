using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Rednest.Core.Entities;

#nullable disable

namespace Rednest.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Add2FAAndAccountVerifyToUserSessions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "2FA",
                table: "UserSessions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<List<AccountVerifyEntry>>(
                name: "AccountVerify",
                table: "UserSessions",
                type: "jsonb",
                nullable: false,
                defaultValueSql: "'[]'::jsonb");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "2FA",
                table: "UserSessions");

            migrationBuilder.DropColumn(
                name: "AccountVerify",
                table: "UserSessions");
        }
    }
}
