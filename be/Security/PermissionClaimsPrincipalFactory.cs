using System.Security.Claims;
using FA23_Convocation2023_API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace FA23_Convocation2023_API.Security;

public sealed class PermissionClaimsPrincipalFactory : UserClaimsPrincipalFactory<ApplicationUser, IdentityRole>
{
    public PermissionClaimsPrincipalFactory(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        IOptions<IdentityOptions> options)
        : base(userManager, roleManager, options) { }

    protected override async Task<ClaimsIdentity> GenerateClaimsAsync(ApplicationUser user)
    {
        var identity = await base.GenerateClaimsAsync(user);
        var roles = await UserManager.GetRolesAsync(user);
        foreach (var permission in Permissions.ForRoles(roles))
        {
            identity.AddClaim(new Claim("permission", permission));
        }
        return identity;
    }
}
