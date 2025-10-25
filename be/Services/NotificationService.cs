using FA23_Convocation2023_API.Models;
using Microsoft.EntityFrameworkCore;

namespace FA23_Convocation2023_API.Services
{
    public class NotificationService
    {
        private readonly Convo24Context _context;

        public NotificationService(Convo24Context context)
        {
            _context = context;
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
            return notification;
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