using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Rednest.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateReviewStatusToTextAndAddUpdatedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE ""Reviews"" 
                ALTER COLUMN ""Status"" DROP DEFAULT;

                ALTER TABLE ""Reviews"" 
                ALTER COLUMN ""Status"" TYPE text 
                USING COALESCE(""Status"" ->> 'Status', 'Pending');

                ALTER TABLE ""Reviews"" 
                ALTER COLUMN ""Status"" SET DEFAULT 'Pending';
            ");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Reviews",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Reviews");

            migrationBuilder.AlterColumn<object>(
                name: "Status",
                table: "Reviews",
                type: "jsonb",
                nullable: false,
                defaultValueSql: "'{\"Status\":\"Pending\"}'::jsonb",
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "Pending");
        }
    }
}
