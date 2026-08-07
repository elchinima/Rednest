using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Rednest.Core.Entities;

#nullable disable

namespace Rednest.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class GroupUserPromoFieldsJson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DELETE FROM \"UserPromos\";");

            migrationBuilder.DropColumn(
                name: "ActivatedAt",
                table: "UserPromos");

            migrationBuilder.DropColumn(
                name: "BarCode",
                table: "UserPromos");

            migrationBuilder.DropColumn(
                name: "ExpiresAt",
                table: "UserPromos");

            migrationBuilder.DropColumn(
                name: "PrizeDescription",
                table: "UserPromos");

            migrationBuilder.DropColumn(
                name: "PrizeName",
                table: "UserPromos");

            migrationBuilder.DropColumn(
                name: "PromoCode",
                table: "UserPromos");

            migrationBuilder.AddColumn<PromoCodes>(
                name: "Codes",
                table: "UserPromos",
                type: "jsonb",
                nullable: false);

            migrationBuilder.AddColumn<PromoDates>(
                name: "Dates",
                table: "UserPromos",
                type: "jsonb",
                nullable: false);

            migrationBuilder.AddColumn<PrizeInfo>(
                name: "PrizeInfo",
                table: "UserPromos",
                type: "jsonb",
                nullable: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Codes",
                table: "UserPromos");

            migrationBuilder.DropColumn(
                name: "Dates",
                table: "UserPromos");

            migrationBuilder.DropColumn(
                name: "PrizeInfo",
                table: "UserPromos");

            migrationBuilder.AddColumn<DateTime>(
                name: "ActivatedAt",
                table: "UserPromos",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "BarCode",
                table: "UserPromos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpiresAt",
                table: "UserPromos",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "PrizeDescription",
                table: "UserPromos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PrizeName",
                table: "UserPromos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PromoCode",
                table: "UserPromos",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
