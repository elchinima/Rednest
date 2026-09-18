using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Rednest.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProductTranslations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DescriptionTranslations",
                table: "Products",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NameTranslations",
                table: "Products",
                type: "jsonb",
                nullable: true);

            // Migrate existing Name/Description into EN slot — no data loss.
            migrationBuilder.Sql(@"
                UPDATE ""Products""
                SET
                    ""NameTranslations"" = jsonb_build_object(
                        'EN', COALESCE(""Name"", ''),
                        'RU', '',
                        'AZ', ''
                    ),
                    ""DescriptionTranslations"" = jsonb_build_object(
                        'EN', COALESCE(""Description"", ''),
                        'RU', '',
                        'AZ', ''
                    )
                WHERE ""NameTranslations"" IS NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DescriptionTranslations",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "NameTranslations",
                table: "Products");
        }
    }
}
