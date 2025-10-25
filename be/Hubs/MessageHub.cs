using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace FA23_Convocation2023_API.Hubs;

[Authorize]
public sealed class MessageHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        var userRole = Context.User?.FindFirst(ClaimTypes.Role)?.Value;
        var userEmail = Context.User?.FindFirst(ClaimTypes.Email)?.Value;

        Console.WriteLine($"[SignalR DEBUG] Connection attempt - UserId: {userId}, Role: {userRole}, Email: {userEmail}, ConnectionId: {Context.ConnectionId}");

        // Add user to role-based groups
        if (!string.IsNullOrEmpty(userRole))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, userRole);
            Console.WriteLine($"[SignalR SUCCESS] User {userId} ({userEmail}) with role {userRole} connected and added to group '{userRole}': {Context.ConnectionId}");
        }
        else
        {
            Console.WriteLine($"[SignalR WARNING] User {userId} ({userEmail}) connected but has no role: {Context.ConnectionId}");
        }

        await Clients.All.SendAsync("ReceiveMessage", $"User {userId} has joined");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.UserIdentifier;
        var userRole = Context.User?.FindFirst(ClaimTypes.Role)?.Value;

        if (!string.IsNullOrEmpty(userRole))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, userRole);
            Console.WriteLine($"[SignalR] User {userId} with role {userRole} disconnected: {Context.ConnectionId}");
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task SendMessage(string methodName, object data)
    {
        await Clients.All.SendAsync(methodName, data);
    }

    // Method for Managers to broadcast TTS notifications to Noticers
    public async Task BroadcastTTSToNoticers(object notificationData)
    {
        var userRole = Context.User?.FindFirst(ClaimTypes.Role)?.Value;
        var userId = Context.UserIdentifier;

        Console.WriteLine($"[SignalR DEBUG] BroadcastTTSToNoticers called by user {userId} with role {userRole}");

        // Only allow Managers to broadcast
        if (userRole == "MN") // Manager role
        {
            Console.WriteLine($"[SignalR BROADCAST] Manager {userId} broadcasting TTS to NO group: {notificationData}");
            await Clients.Group("NO").SendAsync("ReceiveTTSBroadcast", notificationData);
            Console.WriteLine($"[SignalR BROADCAST] Successfully sent ReceiveTTSBroadcast event to NO group");
        }
        else
        {
            Console.WriteLine($"[SignalR ERROR] User {userId} with role {userRole} not authorized to broadcast. Only MN role allowed.");
            throw new HubException("Only Managers can broadcast TTS notifications.");
        }
    }

    // Method to join/leave the Noticer group explicitly (for announcer systems)
    public async Task JoinNoticerGroup()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "NO");
        Console.WriteLine($"[SignalR DEBUG] Connection {Context.ConnectionId} explicitly joined NO group for notifications");
    }

    public async Task LeaveNoticerGroup()
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "NO");
        Console.WriteLine($"[SignalR DEBUG] Connection {Context.ConnectionId} left NO group");
    }
}

