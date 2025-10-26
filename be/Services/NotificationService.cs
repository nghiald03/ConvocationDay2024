using FA23_Convocation2023_API.Models;
using FA23_Convocation2023_API.Hubs;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;

namespace FA23_Convocation2023_API.Services
{
    public class NotificationService
    {
        private readonly Convo24Context _context;
        private readonly IHubContext<MessageHub> _hubContext;

        public NotificationService(Convo24Context context, IHubContext<MessageHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        // Get all notifications with pagination
        public async Task<List<Notification>> GetAllNotificationsAsync(int pageIndex = 1, int pageSize = 10, string? status = null)
        {
            Console.WriteLine($"[DEBUG SERVICE] Getting notifications from database - pageIndex: {pageIndex}, pageSize: {pageSize}, status: {status}");

            // First, try to get total count to see if table has any data
            var totalCount = await _context.Notifications.CountAsync();
            Console.WriteLine($"[DEBUG SERVICE] Total notifications in database: {totalCount}");

            var query = _context.Notifications
                .AsQueryable();

            if (!string.IsNullOrEmpty(status))
            {
                Console.WriteLine($"[DEBUG SERVICE] Filtering by status: {status}");
                query = query.Where(n => n.Status == status);
            }

            var result = await query
                .OrderByDescending(n => n.CreatedAt)
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            Console.WriteLine($"[DEBUG SERVICE] Query returned {result.Count} notifications");
            return result;
        }

        // Get notification by ID
        public async Task<Notification?> GetNotificationByIdAsync(int id)
        {
            return await _context.Notifications
                .FirstOrDefaultAsync(n => n.NotificationId == id);
        }

        // Create new notification
        public async Task<Notification> CreateNotificationAsync(Notification notification)
        {
            notification.CreatedAt = DateTime.Now;
            notification.Status = "PENDING";

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            // Broadcast new notification to NO group via SignalR
            await BroadcastNotificationToNoticers(notification, true);

            return notification;
        }

        // Helper method to broadcast notification to NO group
        private async Task BroadcastNotificationToNoticers(Notification notification, bool isNewNotification = false)
        {
            Console.WriteLine($"[SERVICE] Broadcasting notification {notification.NotificationId} to NO group");

            // Get hall and session info if available
            var hall = notification.HallId.HasValue ? await _context.Halls.FindAsync(notification.HallId.Value) : null;
            var session = notification.SessionId.HasValue ? await _context.Sessions.FindAsync(notification.SessionId.Value) : null;

            var broadcastData = new
            {
                NotificationId = notification.NotificationId,
                Title = notification.Title,
                Content = notification.Content,
                Priority = notification.Priority,
                PriorityText = GetPriorityText(notification.Priority),
                RepeatCount = notification.RepeatCount,
                HallName = hall?.HallName,
                SessionNumber = session?.Session1,
                Scope = GetNotificationScope(notification, hall, session),
                BroadcastAt = DateTime.UtcNow,
                IsNewNotification = isNewNotification // Flag to indicate if this is a new notification
            };

            Console.WriteLine($"[SERVICE DEBUG] Broadcasting data: {System.Text.Json.JsonSerializer.Serialize(broadcastData)}");
            await _hubContext.Clients.Group("NO").SendAsync("ReceiveTTSBroadcast", broadcastData);
            Console.WriteLine($"[SERVICE] Notification {notification.NotificationId} broadcasted to NO group successfully");
        }

        // Helper method to get priority text
        private string GetPriorityText(int priority)
        {
            return priority switch
            {
                1 => "High",
                2 => "Medium",
                3 => "Low",
                _ => "Normal"
            };
        }

        // Helper method to get notification scope
        private string GetNotificationScope(Notification notification, Hall? hall, Session? session)
        {
            if (notification.HallId.HasValue && notification.SessionId.HasValue)
            {
                return $"Hội trường {hall?.HallName} - Đợt {session?.Session1}";
            }
            else if (notification.HallId.HasValue)
            {
                return $"Hội trường {hall?.HallName}";
            }
            else if (notification.SessionId.HasValue)
            {
                return $"Đợt {session?.Session1}";
            }
            else
            {
                return "Toàn trường";
            }
        }

        // Update notification
        public async Task<Notification?> UpdateNotificationAsync(int id, Notification updatedNotification)
        {
            var notification = await _context.Notifications.FindAsync(id);
            if (notification == null) return null;

            notification.Title = updatedNotification.Title;
            notification.Content = updatedNotification.Content;
            notification.Priority = updatedNotification.Priority;
            notification.HallId = updatedNotification.HallId;
            notification.SessionId = updatedNotification.SessionId;
            notification.ScheduledAt = updatedNotification.ScheduledAt;
            notification.IsAutomatic = updatedNotification.IsAutomatic;
            notification.RepeatCount = updatedNotification.RepeatCount;

            await _context.SaveChangesAsync();
            return notification;
        }

        // Delete notification
        public async Task<bool> DeleteNotificationAsync(int id)
        {
            var notification = await _context.Notifications.FindAsync(id);
            if (notification == null) return false;

            _context.Notifications.Remove(notification);
            await _context.SaveChangesAsync();
            return true;
        }

        // Mark notification as broadcasting
        public async Task<bool> StartBroadcastAsync(int id, string broadcastByUserId)
        {
            var notification = await _context.Notifications.FindAsync(id);
            if (notification == null || notification.Status != "PENDING") return false;

            notification.Status = "BROADCASTING";
            notification.BroadcastBy = broadcastByUserId;
            notification.BroadcastAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return true;
        }

        // Mark notification as completed
        public async Task<bool> CompleteBroadcastAsync(int id)
        {
            var notification = await _context.Notifications.FindAsync(id);
            if (notification == null || notification.Status != "BROADCASTING") return false;

            notification.Status = "COMPLETED";
            await _context.SaveChangesAsync();
            return true;
        }

        // Cancel notification
        public async Task<bool> CancelNotificationAsync(int id)
        {
            var notification = await _context.Notifications.FindAsync(id);
            if (notification == null || notification.Status == "COMPLETED") return false;

            notification.Status = "CANCELLED";
            await _context.SaveChangesAsync();
            return true;
        }

        // Get pending notifications for auto broadcast
        public async Task<List<Notification>> GetPendingAutomaticNotificationsAsync()
        {
            return await _context.Notifications
                .Where(n => n.Status == "PENDING" &&
                           n.IsAutomatic &&
                           n.ScheduledAt != null &&
                           n.ScheduledAt <= DateTime.Now)
                .Include(n => n.Hall)
                .Include(n => n.Session)
                .ToListAsync();
        }

        // Get notifications by hall and session
        public async Task<List<Notification>> GetNotificationsByHallAndSessionAsync(int? hallId, int? sessionId)
        {
            var query = _context.Notifications.AsQueryable();

            if (hallId.HasValue)
            {
                query = query.Where(n => n.HallId == hallId || n.HallId == null);
            }

            if (sessionId.HasValue)
            {
                query = query.Where(n => n.SessionId == sessionId || n.SessionId == null);
            }

            return await query
                .Where(n => n.Status == "PENDING")
                .OrderBy(n => n.Priority)
                .ThenBy(n => n.CreatedAt)
                .ToListAsync();
        }
    }
}