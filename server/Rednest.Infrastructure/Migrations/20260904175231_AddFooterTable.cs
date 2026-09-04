using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Rednest.Core.Entities;

#nullable disable

namespace Rednest.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFooterTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Footer",
                columns: table => new
                {
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    FooterEN = table.Column<FooterLanguageContent>(type: "jsonb", nullable: false, defaultValueSql: "'{}'::jsonb"),
                    FooterRU = table.Column<FooterLanguageContent>(type: "jsonb", nullable: false, defaultValueSql: "'{}'::jsonb"),
                    FooterAZ = table.Column<FooterLanguageContent>(type: "jsonb", nullable: false, defaultValueSql: "'{}'::jsonb")
                },
                constraints: table =>
                {
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Footer");
        }
    }
}
