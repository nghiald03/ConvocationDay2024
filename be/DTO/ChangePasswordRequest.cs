using System.ComponentModel.DataAnnotations;

namespace FA23_Convocation2023_API.DTO;

public sealed class ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required, MinLength(12)]
    public string NewPassword { get; set; } = string.Empty;
}
