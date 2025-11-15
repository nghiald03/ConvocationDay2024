using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FA23_Convocation2023_API.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionInDayToBachelor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SessionInDay",
                table: "Bachelor",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SessionInDay",
                table: "Bachelor");
        }
    }
}
