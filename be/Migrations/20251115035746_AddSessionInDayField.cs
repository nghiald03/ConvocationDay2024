using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FA23_Convocation2023_API.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionInDayField : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SessionInDay",
                table: "Session",
                type: "int",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Session",
                keyColumn: "SessionId",
                keyValue: 100,
                column: "SessionInDay",
                value: null);

            migrationBuilder.UpdateData(
                table: "Session",
                keyColumn: "SessionId",
                keyValue: 111,
                column: "SessionInDay",
                value: null);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SessionInDay",
                table: "Session");
        }
    }
}
