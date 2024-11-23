using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace FA23_Convocation2023_API.Migrations
{
    /// <inheritdoc />
    public partial class sheetSession : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Session",
                columns: new[] { "SessionId", "Session" },
                values: new object[,]
                {
                    { 100, 100 },
                    { 111, 111 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Session",
                keyColumn: "SessionId",
                keyValue: 100);

            migrationBuilder.DeleteData(
                table: "Session",
                keyColumn: "SessionId",
                keyValue: 111);
        }
    }
}
