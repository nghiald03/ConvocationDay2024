using FA23_Convocation2023_API.Hubs;
using FA23_Convocation2023_API.Media;
using FA23_Convocation2023_API.Models;
using FA23_Convocation2023_API.Security;
using FA23_Convocation2023_API.Services;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;

namespace FA23_Convocation2023_API;

public static class Program
{
    public static async Task Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required.");

        builder.Services.AddDbContext<Convo24Context>(options => options.UseSqlServer(connectionString, sql =>
            sql.EnableRetryOnFailure(3, TimeSpan.FromSeconds(5), null)));

        builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
        {
            options.Password.RequiredLength = 12;
            options.Password.RequireDigit = true;
            options.Password.RequireLowercase = true;
            options.Password.RequireUppercase = true;
            options.Password.RequireNonAlphanumeric = true;
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            options.User.RequireUniqueEmail = true;
        })
        .AddEntityFrameworkStores<Convo24Context>()
        .AddClaimsPrincipalFactory<PermissionClaimsPrincipalFactory>()
        .AddDefaultTokenProviders();

        builder.Services.ConfigureApplicationCookie(options =>
        {
            options.Cookie.Name = builder.Environment.IsDevelopment() ? "convocation-session" : "__Host-convocation-session";
            options.Cookie.HttpOnly = true;
            options.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.Path = "/";
            options.SlidingExpiration = true;
            options.ExpireTimeSpan = TimeSpan.FromHours(8);
            options.Events.OnRedirectToLogin = context => { context.Response.StatusCode = StatusCodes.Status401Unauthorized; return Task.CompletedTask; };
            options.Events.OnRedirectToAccessDenied = context => { context.Response.StatusCode = StatusCodes.Status403Forbidden; return Task.CompletedTask; };
        });

        builder.Services.AddAntiforgery(options =>
        {
            options.Cookie.Name = builder.Environment.IsDevelopment() ? "convocation-csrf" : "__Host-convocation-csrf";
            options.Cookie.HttpOnly = true;
            options.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
            options.Cookie.SameSite = SameSiteMode.Strict;
            options.HeaderName = "X-XSRF-TOKEN";
        });

        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
        if (builder.Environment.IsProduction() && allowedOrigins.Length == 0)
            throw new InvalidOperationException("Cors:AllowedOrigins must be configured in production.");
        builder.Services.AddCors(options => options.AddPolicy("Frontend", policy =>
        {
            if (allowedOrigins.Length > 0) policy.WithOrigins(allowedOrigins);
            else policy.WithOrigins("http://localhost:3000", "http://localhost:3001");
            policy.AllowAnyHeader().AllowAnyMethod().AllowCredentials();
        }));

        builder.Services.AddAuthorization(options =>
        {
            foreach (var permission in Permissions.ByRole.Values.SelectMany(x => x).Distinct())
                options.AddPolicy(permission, policy => policy.RequireClaim("permission", permission));
        });

        builder.Services.Configure<ObjectStorageOptions>(builder.Configuration.GetSection(ObjectStorageOptions.SectionName));
        builder.Services.AddSingleton<IObjectStorage, MinioObjectStorage>();
        builder.Services.AddScoped<MediaValidator>();
        builder.Services.AddScoped<MediaService>();
        builder.Services.AddScoped<LegacyMediaMigrationService>();
        builder.Services.AddScoped<IdentityMigrationService>();
        builder.Services.AddScoped<IPasswordResetDelivery, SmtpPasswordResetDelivery>();
        builder.Services.AddScoped<BachelorService>()
            .AddScoped<CheckInService>()
            .AddScoped<HallService>()
            .AddScoped<SessionService>()
            .AddScoped<StatisticsService>()
            .AddScoped<NotificationService>();

        builder.Services.AddControllers().AddJsonOptions(options =>
            options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles);
        builder.Services.AddSignalR();
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen(options =>
        {
            options.AddSecurityDefinition("cookie", new OpenApiSecurityScheme { Type = SecuritySchemeType.ApiKey, In = ParameterLocation.Cookie, Name = "__Host-convocation-session" });
        });
        builder.Services.AddHealthChecks();
        builder.Services.AddMemoryCache();

        var app = builder.Build();
        app.UseForwardedHeaders(new ForwardedHeadersOptions
        {
            ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
        });
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }
        app.UseHttpsRedirection();
        app.UseCors("Frontend");
        app.UseAuthentication();
        app.Use(async (context, next) =>
        {
            var method = context.Request.Method;
            var mutation = method is "POST" or "PUT" or "PATCH" or "DELETE";
            if (mutation && context.User.Identity?.IsAuthenticated == true && context.Request.Path.StartsWithSegments("/api"))
            {
                try
                {
                    await context.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(context);
                }
                catch (AntiforgeryValidationException)
                {
                    context.Response.StatusCode = StatusCodes.Status400BadRequest;
                    await context.Response.WriteAsJsonAsync(new { code = "security/invalid-csrf", message = "The request could not be verified." });
                    return;
                }
            }
            await next();
        });
        app.UseAuthorization();
        app.MapHealthChecks("/health");
        app.MapHub<MessageHub>("/chat-hub");
        app.MapControllers();

        await InitializeAsync(app);
        if (args.Contains("--migrate-media", StringComparer.OrdinalIgnoreCase))
        {
            await using var migrationScope = app.Services.CreateAsyncScope();
            var migrator = migrationScope.ServiceProvider.GetRequiredService<LegacyMediaMigrationService>();
            var dryRun = args.Contains("--dry-run", StringComparer.OrdinalIgnoreCase);
            var report = await migrator.RunAsync(dryRun);
            var reportPath = Path.Combine(app.Environment.ContentRootPath, $"media-migration-{DateTime.UtcNow:yyyyMMddHHmmss}.json");
            await LegacyMediaMigrationService.WriteReportAsync(report, reportPath);
            return;
        }
        await app.RunAsync();
    }

    private static async Task InitializeAsync(WebApplication app)
    {
        await using var scope = app.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<Convo24Context>();
        await db.Database.MigrateAsync();
        await scope.ServiceProvider.GetRequiredService<IdentityMigrationService>().RunAsync();
        await scope.ServiceProvider.GetRequiredService<IObjectStorage>().EnsureBucketAsync();
    }
}
