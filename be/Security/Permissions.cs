namespace FA23_Convocation2023_API.Security;

public static class Permissions
{
    public const string ManageSystem = "system.manage";
    public const string ManageHalls = "halls.manage";
    public const string ManageSessions = "sessions.manage";
    public const string ManageBachelors = "bachelors.manage";
    public const string CheckIn = "checkin.execute";
    public const string ControlLed = "led.control";
    public const string ManageNotifications = "notifications.manage";
    public const string BroadcastNotifications = "notifications.broadcast";
    public const string ManageMedia = "media.manage";

    public static readonly IReadOnlyDictionary<string, string[]> ByRole =
        new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            ["MN"] = new[] { ManageSystem, ManageHalls, ManageSessions, ManageBachelors, CheckIn, ControlLed, ManageNotifications, BroadcastNotifications, ManageMedia },
            ["CK"] = new[] { CheckIn },
            ["MC"] = new[] { ControlLed },
            ["US"] = new[] { ControlLed },
            ["NO"] = new[] { ManageNotifications, BroadcastNotifications }
        };

    public static IReadOnlyCollection<string> ForRoles(IEnumerable<string> roles) =>
        roles.SelectMany(role => ByRole.TryGetValue(role, out var permissions) ? permissions : Array.Empty<string>())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(permission => permission)
            .ToArray();
}
