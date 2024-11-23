using FA23_Convocation2023_API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace FA23_Convocation2023_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DatabaseController : ControllerBase
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<DatabaseController> _logger;

        public DatabaseController(IServiceProvider serviceProvider, ILogger<DatabaseController> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        [HttpPost("reset-database")]
        [Authorize(Roles = "MN")]
        public IActionResult ResetDatabase()
        {
            using (var scope = _serviceProvider.CreateScope())
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<Convo24Context>();

                try
                {
                    // Lấy tên và chuỗi kết nối của database
                    var databaseName = dbContext.Database.GetDbConnection().Database;
                    if (string.IsNullOrEmpty(databaseName))
                    {
                        _logger.LogError("Database name is empty. Please check the connection string.");
                        return BadRequest("Invalid database name.");
                    }

                    _logger.LogInformation($"Resetting database: {databaseName}");

                    // Drop database
                    var masterConnectionString = dbContext.Database.GetDbConnection().ConnectionString.Replace(databaseName, "master");
                    using (var connection = new SqlConnection(masterConnectionString))
                    {
                        connection.Open();

                        // Terminate all connections to the database
                        var terminateConnectionsCommand = $@"
                    ALTER DATABASE [{databaseName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                    ALTER DATABASE [{databaseName}] SET MULTI_USER;
                ";
                        using (var command = new SqlCommand(terminateConnectionsCommand, connection))
                        {
                            command.ExecuteNonQuery();
                        }

                        // Drop database
                        var dropCommand = $"DROP DATABASE [{databaseName}]";
                        using (var command = new SqlCommand(dropCommand, connection))
                        {
                            command.ExecuteNonQuery();
                            _logger.LogInformation("Database dropped successfully.");
                        }
                    }

                    // Reapply migrations
                    dbContext.Database.Migrate();
                    _logger.LogInformation("Database recreated and migrations applied successfully.");

                    return Ok("Database reset successfully.");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "An error occurred while resetting the database.");
                    return StatusCode(500, "An error occurred while resetting the database.");
                }
            }
        }
    }
}
