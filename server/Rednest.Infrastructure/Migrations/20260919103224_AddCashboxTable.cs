using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Rednest.Core.Entities;

#nullable disable

namespace Rednest.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCashboxTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Cashbox",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PayMethod = table.Column<string>(type: "text", nullable: false),
                    Products = table.Column<List<CashboxProductItem>>(type: "jsonb", nullable: false, defaultValueSql: "'[]'::jsonb"),
                    Paid = table.Column<CashboxPaidDetails>(type: "jsonb", nullable: false, defaultValueSql: "'{}'::jsonb"),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cashbox", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Cashbox");
        }
    }
}
