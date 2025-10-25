using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FA23_Convocation2023_API.Migrations
{
    /// <inheritdoc />
    public partial class AddRepeatCountToNotification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RepeatCount",
                table: "Notification",
                type: "int",
                nullable: false,
                defaultValue: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RepeatCount",
                table: "Notification");
        }
    }
}
