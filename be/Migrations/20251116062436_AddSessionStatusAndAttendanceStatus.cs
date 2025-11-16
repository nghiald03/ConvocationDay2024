using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FA23_Convocation2023_API.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionStatusAndAttendanceStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "Session",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "AttendanceStatus",
                table: "Bachelor",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.UpdateData(
                table: "Session",
                keyColumn: "SessionId",
                keyValue: 100,
                column: "Status",
                value: 0);

            migrationBuilder.UpdateData(
                table: "Session",
                keyColumn: "SessionId",
                keyValue: 111,
                column: "Status",
                value: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Status",
                table: "Session");

            migrationBuilder.DropColumn(
                name: "AttendanceStatus",
                table: "Bachelor");
        }
    }
}
