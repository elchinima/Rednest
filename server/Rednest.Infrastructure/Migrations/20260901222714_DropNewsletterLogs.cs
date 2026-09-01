using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Rednest.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class DropNewsletterLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NewsletterLogs");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NewsletterLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Badge = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ButtonText = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ButtonUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ContentHtml = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    FailedCount = table.Column<int>(type: "integer", nullable: false),
                    Heading = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    PlainText = table.Column<string>(type: "text", nullable: true),
                    Preheader = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    RecipientCount = table.Column<int>(type: "integer", nullable: false),
                    RecipientEmails = table.Column<string>(type: "jsonb", nullable: false, defaultValueSql: "'[]'::jsonb"),
                    SenderEmail = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false, defaultValue: "noreply@rednest.com"),
                    SenderName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false, defaultValue: "Rednest"),
                    SentByAdminId = table.Column<Guid>(type: "uuid", nullable: false),
                    SentByAdminName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "Sent"),
                    Subject = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    SuccessCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NewsletterLogs", x => x.Id);
                });
        }
    }
}
