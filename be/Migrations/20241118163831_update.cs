using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace FA23_Convocation2023_API.Migrations
{
    /// <inheritdoc />
    public partial class update : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Roles",
                columns: new[] { "RoleID", "RoleName" },
                values: new object[,]
                {
                    { "1", "MN" },
                    { "2", "CK" },
                    { "3", "US" }
                });

            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "UserID", "Email", "FullName", "Password", "RoleID" },
                values: new object[,]
                {
                    { "1", "mana@gmail.com", "Mana", "123456", "1" },
                    { "2", "checkin@gmail.com", "CheckIn", "123456", "2" },
                    { "3", "user@gmail.com", "User", "123456", "3" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "UserID",
                keyValue: "1");

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "UserID",
                keyValue: "2");

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "UserID",
                keyValue: "3");

            migrationBuilder.DeleteData(
                table: "Roles",
                keyColumn: "RoleID",
                keyValue: "1");

            migrationBuilder.DeleteData(
                table: "Roles",
                keyColumn: "RoleID",
                keyValue: "2");

            migrationBuilder.DeleteData(
                table: "Roles",
                keyColumn: "RoleID",
                keyValue: "3");
        }
    }
}
