using Azure.Core;
using FA23_Convocation2023_API.DTO;
using FA23_Convocation2023_API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace FA23_Convocation2023_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly Convo24Context _context = new Convo24Context();
        private readonly IConfiguration _configuration;
        
        public AuthController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpPost("Login")]
        public async Task<IActionResult> LoginAsync(LoginRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.UserName);
            if (user == null)
            {
                return BadRequest("auth/incorrect-userID");
            }
            if (request.Password != user.Password)
            {
                return BadRequest("auth/incorrect-password");
            }
            string token = CreateToken(user);
            return Ok(new
            {
                accessToken = token,
                status = StatusCodes.Status200OK,
                data = "Login successfully!"
            });
        }

        [HttpGet("TestAuthorize")]
        [Authorize(Roles = "AD")]
        public IActionResult TestAuthorize()
        {
            return Ok("Bạn là admin!");
        }

        private string CreateToken(User user)
        {
            var role = _context.Roles.FirstOrDefault(r => r.RoleId == user.RoleId);
            List<Claim> claims = new List<Claim>
            {
                new Claim("userID", user.UserId),
                new Claim("email", user.Email),
                new Claim("fullname", user.FullName),
                new Claim("role", role.RoleName),
            };
            var key = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(
                _configuration.GetSection("Jwt:Key").Value));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);
            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(1440),
                signingCredentials: creds
                );
            var jwt = new JwtSecurityTokenHandler().WriteToken(token);
            return jwt;
        }
    }
}
