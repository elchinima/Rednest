using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Rednest.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RevertStatusToJsonbWithUpdatedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE ""Reviews"" 
                ALTER COLUMN ""Status"" DROP DEFAULT;

                ALTER TABLE ""Reviews"" 
                ALTER COLUMN ""Status"" TYPE jsonb 
                USING jsonb_build_object('Status', ""Status"", 'UpdatedAt', COALESCE(""UpdatedAt"", NOW()));

                ALTER TABLE ""Reviews"" 
                ALTER COLUMN ""Status"" SET DEFAULT '{""Status"": ""Pending""}'::jsonb;
            ");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Reviews");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Reviews",
                type: "text",
                nullable: false,
                defaultValue: "Pending",
                oldClrType: typeof(string),
                oldType: "jsonb");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Reviews",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()");
        }
    }
}
