using System.Net;
using System.Net.Mail;

namespace FA23_Convocation2023_API.Services;

public interface IPasswordResetDelivery
{
    Task<bool> SendAsync(string email, string token, CancellationToken cancellationToken = default);
}

public sealed class SmtpPasswordResetDelivery : IPasswordResetDelivery
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<SmtpPasswordResetDelivery> _logger;

    public SmtpPasswordResetDelivery(IConfiguration configuration, ILogger<SmtpPasswordResetDelivery> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<bool> SendAsync(string email, string token, CancellationToken cancellationToken = default)
    {
        var host = _configuration["Email:SmtpHost"];
        var from = _configuration["Email:From"];
        var publicOrigin = _configuration["App:PublicOrigin"];
        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(from) || !Uri.TryCreate(publicOrigin, UriKind.Absolute, out var origin))
        {
            _logger.LogWarning("Password reset email delivery is not configured.");
            return false;
        }

        var resetUri = new Uri(origin, $"/reset-password?email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(token)}");
        using var message = new MailMessage(from, email)
        {
            Subject = "Convocation password reset",
            Body = $"Open this link to reset your password: {resetUri}",
            IsBodyHtml = false
        };
        using var client = new SmtpClient(host, _configuration.GetValue("Email:SmtpPort", 587))
        {
            EnableSsl = _configuration.GetValue("Email:UseSsl", true)
        };
        var username = _configuration["Email:Username"];
        var password = _configuration["Email:Password"];
        if (!string.IsNullOrWhiteSpace(username) && !string.IsNullOrWhiteSpace(password))
            client.Credentials = new NetworkCredential(username, password);
        await client.SendMailAsync(message, cancellationToken);
        return true;
    }
}
