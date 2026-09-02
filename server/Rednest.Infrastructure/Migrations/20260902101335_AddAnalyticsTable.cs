using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Rednest.Core.Entities;

#nullable disable

namespace Rednest.Infrastructure.Migrations
{
    public partial class AddAnalyticsTable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Analytics",
                columns: table => new
                {
                    MonthYear = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ProductsSold = table.Column<MetricSnapshot<int>>(type: "jsonb", nullable: false, defaultValueSql: "'{}'::jsonb"),
                    MonthlyRevenue = table.Column<MetricSnapshot<decimal>>(type: "jsonb", nullable: false, defaultValueSql: "'{}'::jsonb"),
                    NewRegistrations = table.Column<MetricSnapshot<int>>(type: "jsonb", nullable: false, defaultValueSql: "'{}'::jsonb"),
                    DailyPeakOnline = table.Column<DailyPeakOnlineData>(type: "jsonb", nullable: false, defaultValueSql: "'{}'::jsonb"),
                    AverageRating = table.Column<MetricSnapshot<decimal>>(type: "jsonb", nullable: false, defaultValueSql: "'{}'::jsonb"),
                    UsersRated = table.Column<MetricSnapshot<int>>(type: "jsonb", nullable: false, defaultValueSql: "'{}'::jsonb"),
                    PromosCreated = table.Column<MetricSnapshot<int>>(type: "jsonb", nullable: false, defaultValueSql: "'{}'::jsonb"),
                    PromoDiscounts = table.Column<MetricSnapshot<decimal>>(type: "jsonb", nullable: false, defaultValueSql: "'{}'::jsonb"),
                    FilesInStorage = table.Column<MetricSnapshot<int>>(type: "jsonb", nullable: false, defaultValueSql: "'{}'::jsonb"),
                    StorageUsed = table.Column<MetricSnapshot<string>>(type: "jsonb", nullable: false, defaultValueSql: "'{}'::jsonb"),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Analytics", x => x.MonthYear);
                });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Analytics");
        }
    }
}
