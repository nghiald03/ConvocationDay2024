using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.Filters;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using FA23_Convocation2023_API.Hubs;
using Microsoft.AspNetCore.Localization;
using System.Globalization;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.AspNetCore.Mvc;
using FA23_Convocation2023_API.Models;
using FA23_Convocation2023_API.Services;

namespace FA23_Convocation2023_API
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Configure logging
            var loggerFactory = LoggerFactory.Create(logging => logging.AddConsole());
            var logger = loggerFactory.CreateLogger<Program>();

            // Get connection string (will automatically use DefaultConnection from config/env)
            var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
            var environment = builder.Environment.EnvironmentName;

            logger.LogInformation("Environment: {Environment}", environment);
            logger.LogInformation("Connection String: {ConnectionString}", connectionString);

            // Configure DbContext with proper error handling
            try
            {
                builder.Services.AddDbContext<Convo24Context>(options =>
                    options.UseSqlServer(connectionString, sqlOptions =>
                    {
                        sqlOptions.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorNumbersToAdd: null);
                    }));

                logger.LogInformation("Convo24Context configured successfully.");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to configure DbContext.");
                throw; // Re-throw to prevent startup with bad configuration
            }

            //var connectionString = builder.Configuration.GetConnectionString("Convocation2023DB");

            // Add services to the container.
            builder.Services.AddControllers();
            //builder.Services.AddControllers().AddJsonOptions(options =>
            //{
            //    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.Preserve;
            //});
            //add signalR
            builder.Services.AddSignalR();

            // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
            builder.Services.AddEndpointsApiExplorer();
            // Add DbContext
            // Add CORS
            builder.Services.AddCors(options => {
                options.AddPolicy("CORSPolicy", builder => 
                builder.AllowAnyMethod().AllowAnyHeader().AllowCredentials().SetIsOriginAllowed((hosts) => true));
            });
            // Chỗ này chỉ để config lúc login xong mình sẽ
            // lấy token, ở trên có nút Authorize, ấn vô
            // sẽ mở modal để mình bỏ token để phân quyền á, kiểu v
            // Nói chung chỉ để config cái hộp đấy thoi à
            builder.Services.AddSwaggerGen(options =>
            {
                options.AddSecurityDefinition("oauth2", new OpenApiSecurityScheme
                {
                    Description = "Standard Authorization header using the Bearer scheme (\"bearer {token}\")",
                    In = ParameterLocation.Header,
                    Name = "Authorization",
                    Type = SecuritySchemeType.ApiKey
                });
                options.OperationFilter<SecurityRequirementsOperationFilter>();
            });
            // Chỗ này để add authen thôi, với config tạo cái token á
            builder.Services.AddAuthentication(options =>
            {   // khúc này config cái authen thôi bỏ qua cũng đc
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
                // khúc này config cái access_token nè
            }).AddJwtBearer(o =>
            {
                o.TokenValidationParameters = new TokenValidationParameters //config thông qua các params á
                {
                    // nói chung khúc này để validate cái token thôi
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(builder.Configuration.GetSection("JWT:Key").Value)),
                    ValidateIssuer = false,
                    ValidateAudience = false
                };

                // IMPORTANT: Configure JWT authentication for SignalR
                o.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];

                        // If the request is for our SignalR hub...
                        var path = context.HttpContext.Request.Path;
                        if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/chat-hub"))
                        {
                            // Read the token out of the query string
                            context.Token = accessToken;
                            Console.WriteLine($"[SignalR Auth] Token extracted from query string for hub connection");
                        }
                        return Task.CompletedTask;
                    }
                };
            });

            // Add chức năng phân quyền nè, 1 dòng :)))
            builder.Services.AddAuthorization();
            // Register services
            builder.Services.AddScoped<BachelorService>()
                .AddScoped<CheckInService>()
                .AddScoped<HallService>()
                .AddScoped<SessionService>()
                .AddScoped<StatisticsService>()
                .AddScoped<NotificationService>();

            // Add health checks
            builder.Services.AddHealthChecks();

            // Add memory cache for performance
            builder.Services.AddMemoryCache();

            // Nhớ là nếu cái gì liên quan tới config builder như builder.Services. gì á,
            // thì nhớ là phải bỏ trên dòng này nha, tại từ dòng này trở xuống là 
            // config kh được, do nó build r á
            var app = builder.Build();

            // Khúc này trở xuống đơn giản là project có gì lấy ra xài thoi
            // Configure the HTTP request pipeline.
            // Always enable Swagger for API documentation
            app.UseSwagger();
            app.UseSwaggerUI();

            // Add health check endpoint
            app.MapHealthChecks("/health");

            // Add Cors 1 dòng :))))
            app.UseCors("CORSPolicy");

            app.UseRouting();

            app.UseHttpsRedirection();

            app.UseAuthentication();

            app.UseAuthorization();

            app.MapHub<MessageHub>("chat-hub");

            app.MapControllers();
            // TODO: Initialize database for all environments
             await InitializeDatabaseAsync(app, logger);

            logger.LogInformation("Application starting...");

            app.Run();
        }

        private static async Task InitializeDatabaseAsync(WebApplication app, ILogger logger)
        {
            using var scope = app.Services.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<Convo24Context>();

            try
            {
                logger.LogInformation("Checking database connection...");

                // Test database connection
                await dbContext.Database.CanConnectAsync();
                logger.LogInformation("Database connection successful.");

                // Apply pending migrations
                var pendingMigrations = await dbContext.Database.GetPendingMigrationsAsync();
                if (pendingMigrations.Any())
                {
                    logger.LogInformation("Applying {Count} pending migrations...", pendingMigrations.Count());
                    await dbContext.Database.MigrateAsync();
                    logger.LogInformation("Migrations applied successfully.");
                }
                else
                {
                    logger.LogInformation("Database is up to date.");
                }

                // Verify data seeding
                if (!await dbContext.Users.AnyAsync())
                {
                    logger.LogWarning("No users found. Database may not be properly seeded.");
                }
                else
                {
                    var userCount = await dbContext.Users.CountAsync();
                    logger.LogInformation("Found {UserCount} users in database.", userCount);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Database initialization failed!");
                throw; // Re-throw to prevent startup with failed database
            }
        }
    }
}