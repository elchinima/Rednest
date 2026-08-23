using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Rednest.Core.Entities;

#nullable disable

namespace Rednest.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateOrdersSchemaToItemsAndPayment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Orders",
                table: "Orders",
                newName: "Payment");

            migrationBuilder.AddColumn<List<OrderProductItem>>(
                name: "Items",
                table: "Orders",
                type: "jsonb",
                nullable: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Items",
                table: "Orders");

            migrationBuilder.RenameColumn(
                name: "Payment",
                table: "Orders",
                newName: "Orders");
        }
    }
}
