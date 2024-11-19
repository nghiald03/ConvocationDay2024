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
        public static void Main(string[] args)
        {

            var builder = WebApplication.CreateBuilder(args);
            var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

            var loggerFactory = LoggerFactory.Create(logging => logging.AddConsole());
            var logger = loggerFactory.CreateLogger<Program>();

            
            logger.LogInformation("Connection String: {ConnectionString}", connectionString);

            try
            {
                builder.Services.AddDbContext<Convo24Context>(options =>
                    options.UseSqlServer(connectionString));

                logger.LogInformation("Convo24Context has been configured successfully.");
            }
            catch (Exception ex)
            {
                // Log any exceptions that occur during the setup
                logger.LogError(ex, "An error occurred while configuring the DbContext.");
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
            });

            // Add chức năng phân quyền nè, 1 dòng :)))
            builder.Services.AddAuthorization();
            builder.Services.AddScoped<BachelorService>()
                .AddScoped<CheckInService>()
                .AddScoped<HallService>()
                .AddScoped<SessionService>();

            // Nhớ là nếu cái gì liên quan tới config builder như builder.Services. gì á,
            // thì nhớ là phải bỏ trên dòng này nha, tại từ dòng này trở xuống là 
            // config kh được, do nó build r á
            var app = builder.Build();

            // Khúc này trở xuống đơn giản là project có gì lấy ra xài thoi
            // Configure the HTTP request pipeline.
            app.UseSwagger();
            app.UseSwaggerUI();

            // Add Cors 1 dòng :))))
            app.UseCors("CORSPolicy");

            app.UseRouting();

            app.UseHttpsRedirection();

            app.UseAuthentication();

            app.UseAuthorization();

            app.MapHub<MessageHub>("chat-hub");

            app.MapControllers();
            using (var scope = app.Services.CreateScope())
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<Convo24Context>();

                try
                {
                    // Kiểm tra nếu database không tồn tại, tạo mới
                    if (dbContext.Database.EnsureCreated())
                    {
                        dbContext.Database.Migrate();
                        logger.LogInformation("Database created successfully.");
                    }
                    else
                    {
                        logger.LogInformation("Database already exists.");
                    }

                    
                    
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "An error occurred while ensuring database creation or applying migrations.");
                }
            }

            app.Run();


        }
    }
}