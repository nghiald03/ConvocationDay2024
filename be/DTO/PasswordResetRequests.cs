using System.ComponentModel.DataAnnotations;

namespace FA23_Convocation2023_API.DTO;

public sealed record RequestPasswordResetRequest([Required, EmailAddress] string Email);
public sealed record ConfirmPasswordResetRequest(
    [Required, EmailAddress] string Email,
    [Required] string Token,
    [Required, MinLength(12)] string NewPassword);
