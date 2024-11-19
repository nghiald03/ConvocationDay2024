using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FA23_Convocation2023_API.Migrations
{
    /// <inheritdoc />
    public partial class init : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Hall",
                columns: table => new
                {
                    HallId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    HallName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Hall", x => x.HallId);
                });

            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    RoleID = table.Column<string>(type: "varchar(2)", unicode: false, maxLength: 2, nullable: false),
                    RoleName = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.RoleID);
                });

            migrationBuilder.CreateTable(
                name: "Session",
                columns: table => new
                {
                    SessionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Session = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Session", x => x.SessionId);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    UserID = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Email = table.Column<string>(type: "varchar(100)", unicode: false, maxLength: 100, nullable: true),
                    Password = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    RoleID = table.Column<string>(type: "varchar(2)", unicode: false, maxLength: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.UserID);
                    table.ForeignKey(
                        name: "FK__Users__RoleID__49C3F6B7",
                        column: x => x.RoleID,
                        principalTable: "Roles",
                        principalColumn: "RoleID");
                });

            migrationBuilder.CreateTable(
                name: "Bachelor",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StudentCode = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Mail = table.Column<string>(type: "varchar(100)", unicode: false, maxLength: 100, nullable: true),
                    Faculty = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: true),
                    Major = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: true),
                    Image = table.Column<string>(type: "varchar(250)", unicode: false, maxLength: 250, nullable: true),
                    Status = table.Column<bool>(type: "bit", nullable: true, defaultValueSql: "((0))"),
                    StatusBaChelor = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: true),
                    HallId = table.Column<int>(type: "int", nullable: true),
                    SessionId = table.Column<int>(type: "int", nullable: true),
                    Chair = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: true),
                    ChairParent = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: true),
                    CheckIn = table.Column<bool>(type: "bit", nullable: true),
                    TimeCheckIn = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Bachelor", x => x.Id);
                    table.ForeignKey(
                        name: "FK__Bachelor__HallId__403A8C7D",
                        column: x => x.HallId,
                        principalTable: "Hall",
                        principalColumn: "HallId");
                    table.ForeignKey(
                        name: "FK__Bachelor__Sessio__412EB0B6",
                        column: x => x.SessionId,
                        principalTable: "Session",
                        principalColumn: "SessionId");
                });

            migrationBuilder.CreateTable(
                name: "CheckIn",
                columns: table => new
                {
                    CheckinID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    HallId = table.Column<int>(type: "int", nullable: true),
                    SessionId = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<bool>(type: "bit", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CheckIn", x => x.CheckinID);
                    table.ForeignKey(
                        name: "FK__CheckIn__HallId__440B1D61",
                        column: x => x.HallId,
                        principalTable: "Hall",
                        principalColumn: "HallId");
                    table.ForeignKey(
                        name: "FK__CheckIn__Session__44FF419A",
                        column: x => x.SessionId,
                        principalTable: "Session",
                        principalColumn: "SessionId");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Bachelor_HallId",
                table: "Bachelor",
                column: "HallId");

            migrationBuilder.CreateIndex(
                name: "IX_Bachelor_SessionId",
                table: "Bachelor",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_CheckIn_HallId",
                table: "CheckIn",
                column: "HallId");

            migrationBuilder.CreateIndex(
                name: "IX_CheckIn_SessionId",
                table: "CheckIn",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_RoleID",
                table: "Users",
                column: "RoleID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Bachelor");

            migrationBuilder.DropTable(
                name: "CheckIn");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Hall");

            migrationBuilder.DropTable(
                name: "Session");

            migrationBuilder.DropTable(
                name: "Roles");
        }
    }
}
