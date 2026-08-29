using Microsoft.EntityFrameworkCore.Migrations;
using Rednest.Core.Entities;

#nullable disable

namespace Rednest.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ConvertReviewStatusToJsonbAndDropModeration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Moderation",
                table: "Reviews");

            migrationBuilder.Sql(@"
                ALTER TABLE ""Reviews"" 
                ALTER COLUMN ""Status"" DROP DEFAULT;

                ALTER TABLE ""Reviews"" 
                ALTER COLUMN ""Status"" TYPE jsonb 
                USING jsonb_build_object('Status', ""Status"", 'UpdatedAt', NOW());

                ALTER TABLE ""Reviews"" 
                ALTER COLUMN ""Status"" SET DEFAULT '{""Status"": ""Pending""}'::jsonb;
            ");
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
                oldClrType: typeof(ReviewStatusInfo),
                oldType: "jsonb",
                oldDefaultValueSql: "'{\"Status\":\"Pending\"}'::jsonb");

            migrationBuilder.AddColumn<object>(
                name: "Moderation",
                table: "Reviews",
                type: "jsonb",
                nullable: true);
        }
    }
}
