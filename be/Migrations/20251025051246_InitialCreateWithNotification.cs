using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FA23_Convocation2023_API.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreateWithNotification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Notification",
                columns: table => new
                {
                    NotificationId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Content = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Priority = table.Column<int>(type: "int", nullable: false, defaultValue: 2),
                    HallId = table.Column<int>(type: "int", nullable: true),
                    SessionId = table.Column<int>(type: "int", nullable: true),
                    CreatedBy = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: false),
                    BroadcastBy = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "GETDATE()"),
                    ScheduledAt = table.Column<DateTime>(type: "datetime", nullable: true),
                    BroadcastAt = table.Column<DateTime>(type: "datetime", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "PENDING"),
                    IsAutomatic = table.Column<bool>(type: "bit", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notification", x => x.NotificationId);
                    table.ForeignKey(
                        name: "FK_Notification_Hall_HallId",
                        column: x => x.HallId,
                        principalTable: "Hall",
                        principalColumn: "HallId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Notification_Session_SessionId",
                        column: x => x.SessionId,
                        principalTable: "Session",
                        principalColumn: "SessionId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Notification_Users_BroadcastBy",
                        column: x => x.BroadcastBy,
                        principalTable: "Users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Notification_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "Roles",
                columns: new[] { "RoleID", "RoleName" },
                values: new object[] { "4", "NO" });

            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "UserID", "Email", "FullName", "Password", "RoleID" },
                values: new object[] { "4", "noticer@gmail.com", "Noticer", "123456", "4" });

            migrationBuilder.CreateIndex(
                name: "IX_Notification_BroadcastBy",
                table: "Notification",
                column: "BroadcastBy");

            migrationBuilder.CreateIndex(
                name: "IX_Notification_CreatedBy",
                table: "Notification",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Notification_HallId",
                table: "Notification",
                column: "HallId");

            migrationBuilder.CreateIndex(
                name: "IX_Notification_SessionId",
                table: "Notification",
                column: "SessionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Notification");

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "UserID",
                keyValue: "4");

            migrationBuilder.DeleteData(
                table: "Roles",
                keyColumn: "RoleID",
                keyValue: "4");
        }
    }
}
