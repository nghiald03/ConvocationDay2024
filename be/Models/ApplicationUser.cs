using Microsoft.AspNetCore.Identity;

namespace FA23_Convocation2023_API.Models;

public sealed class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;
    public string? LegacyUserId { get; set; }
    public bool PasswordResetRequired { get; set; } = true;
}
