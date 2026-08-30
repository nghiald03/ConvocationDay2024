using FA23_Convocation2023_API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FA23_Convocation2023_API.Services;

public sealed class IdentityMigrationService
{
    private static readonly string[] Roles = { "MN", "CK", "MC", "US", "NO" };
    private readonly Convo24Context _db;
    private readonly RoleManager<IdentityRole> _roles;
    private readonly UserManager<ApplicationUser> _users;
    private readonly ILogger<IdentityMigrationService> _logger;

    public IdentityMigrationService(
        Convo24Context db,
        RoleManager<IdentityRole> roles,
        UserManager<ApplicationUser> users,
        ILogger<IdentityMigrationService> logger)
    {
        _db = db;
        _roles = roles;
        _users = users;
        _logger = logger;
    }

    public async Task RunAsync(CancellationToken cancellationToken = default)
    {
        foreach (var role in Roles)
        {
            if (!await _roles.RoleExistsAsync(role))
                await _roles.CreateAsync(new IdentityRole(role));
        }

        var legacyUsers = await _db.LegacyUsers.Include(x => x.Role).AsNoTracking().ToListAsync(cancellationToken);
        foreach (var legacy in legacyUsers)
        {
            if (string.IsNullOrWhiteSpace(legacy.Email) || await _users.FindByEmailAsync(legacy.Email) is not null) continue;
            var user = new ApplicationUser
            {
                Id = Guid.NewGuid().ToString(),
                Email = legacy.Email,
                UserName = legacy.Email,
                FullName = legacy.FullName ?? string.Empty,
                LegacyUserId = legacy.UserId,
                EmailConfirmed = true,
                PasswordResetRequired = true
            };
            var created = await _users.CreateAsync(user);
            if (!created.Succeeded)
            {
                _logger.LogError("Could not migrate legacy identity {LegacyUserId}: {Errors}", legacy.UserId, string.Join(',', created.Errors.Select(x => x.Code)));
                continue;
            }
            if (!string.IsNullOrWhiteSpace(legacy.Role?.RoleName))
                await _users.AddToRoleAsync(user, legacy.Role.RoleName);
        }
    }
}
