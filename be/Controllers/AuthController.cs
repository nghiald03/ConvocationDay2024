using FA23_Convocation2023_API.DTO;
using FA23_Convocation2023_API.Models;
using FA23_Convocation2023_API.Security;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using FA23_Convocation2023_API.Services;

namespace FA23_Convocation2023_API.Controllers;

[Route("api/auth")]
[ApiController]
public sealed class AuthController : ControllerBase
{
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IAntiforgery _antiforgery;
    private readonly IPasswordResetDelivery _passwordResetDelivery;
    private readonly IWebHostEnvironment _environment;

    public AuthController(
        SignInManager<ApplicationUser> signInManager,
        UserManager<ApplicationUser> userManager,
        IAntiforgery antiforgery,
        IPasswordResetDelivery passwordResetDelivery,
        IWebHostEnvironment environment)
    {
        _signInManager = signInManager;
        _userManager = userManager;
        _antiforgery = antiforgery;
        _passwordResetDelivery = passwordResetDelivery;
        _environment = environment;
    }

    [HttpGet("csrf")]
    [AllowAnonymous]
    public IActionResult Csrf()
    {
        var tokens = _antiforgery.GetAndStoreTokens(HttpContext);
        Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken!, new CookieOptions
        {
            HttpOnly = false,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Strict,
            Path = "/"
        });
        return NoContent();
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [ValidateAntiforgeryToken]
    public async Task<IActionResult> LoginAsync(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.UserName.Trim());
        if (user is null)
            return Unauthorized(new { code = "auth/invalid-credentials", message = "Email or password is incorrect." });

        if (user.PasswordResetRequired)
            return StatusCode(StatusCodes.Status403Forbidden, new { code = "auth/password-reset-required" });

        var result = await _signInManager.PasswordSignInAsync(user, request.Password, isPersistent: false, lockoutOnFailure: true);
        if (result.IsLockedOut)
            return StatusCode(StatusCodes.Status423Locked, new { code = "auth/locked-out" });
        if (!result.Succeeded)
            return Unauthorized(new { code = "auth/invalid-credentials", message = "Email or password is incorrect." });

        await _userManager.UpdateSecurityStampAsync(user);
        await _signInManager.RefreshSignInAsync(user);
        return Ok(await ToSessionUserAsync(user));
    }

    [HttpPost("logout")]
    [Authorize]
    [ValidateAntiforgeryToken]
    public async Task<IActionResult> LogoutAsync()
    {
        await _signInManager.SignOutAsync();
        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> MeAsync()
    {
        var user = await _userManager.GetUserAsync(User);
        return user is null ? Unauthorized() : Ok(await ToSessionUserAsync(user));
    }

    [HttpPost("password")]
    [Authorize]
    [ValidateAntiforgeryToken]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null) return Unauthorized();
        var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
            return BadRequest(new { code = "auth/password-change-failed", errors = result.Errors.Select(x => x.Code) });
        user.PasswordResetRequired = false;
        await _userManager.UpdateAsync(user);
        await _signInManager.RefreshSignInAsync(user);
        return NoContent();
    }

    [HttpPost("password/reset/request")]
    [AllowAnonymous]
    [ValidateAntiforgeryToken]
    public async Task<IActionResult> RequestPasswordReset(RequestPasswordResetRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email.Trim());
        if (user is null) return Accepted(new { message = "If the account exists, reset instructions will be sent." });
        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var delivered = await _passwordResetDelivery.SendAsync(user.Email!, token, HttpContext.RequestAborted);
        if (!delivered && _environment.IsDevelopment())
            return Ok(new { message = "Development reset token generated.", token });
        return Accepted(new { message = "If the account exists, reset instructions will be sent." });
    }

    [HttpPost("password/reset/confirm")]
    [AllowAnonymous]
    [ValidateAntiforgeryToken]
    public async Task<IActionResult> ConfirmPasswordReset(ConfirmPasswordResetRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email.Trim());
        if (user is null) return BadRequest(new { code = "auth/invalid-reset" });
        var result = await _userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
        if (!result.Succeeded)
            return BadRequest(new { code = "auth/invalid-reset", errors = result.Errors.Select(x => x.Code) });
        user.PasswordResetRequired = false;
        await _userManager.UpdateSecurityStampAsync(user);
        await _userManager.UpdateAsync(user);
        return NoContent();
    }

    private async Task<object> ToSessionUserAsync(ApplicationUser user)
    {
        var roles = await _userManager.GetRolesAsync(user);
        return new
        {
            id = user.Id,
            email = user.Email,
            fullName = user.FullName,
            roles,
            role = roles.FirstOrDefault(),
            permissions = Permissions.ForRoles(roles)
        };
    }
}
