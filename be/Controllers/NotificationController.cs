using FA23_Convocation2023_API.DTO;
using FA23_Convocation2023_API.Models;
using FA23_Convocation2023_API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FA23_Convocation2023_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class NotificationController : ControllerBase
    {
        private readonly NotificationService _notificationService;
        private readonly Convo24Context _context;

        public NotificationController(NotificationService notificationService, Convo24Context context)
        {
            _notificationService = notificationService;
            _context = context;
        }

        private string GetCurrentUserId()
        {
            return User.FindFirst("userID")?.Value ?? "";
        }

        private string GetCurrentUserRole()
        {
            return User.FindFirst("role")?.Value ?? "";
        }

        // GET: api/Notification
        [HttpGet]
        public async Task<ActionResult<NotificationListResponse>> GetNotifications(
            [FromQuery] int pageIndex = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? status = null)
        {
            try
            {
                Console.WriteLine($"[DEBUG] Getting notifications - pageIndex: {pageIndex}, pageSize: {pageSize}, status: {status}");
                var notifications = await _notificationService.GetAllNotificationsAsync(pageIndex, pageSize, status);
                Console.WriteLine($"[DEBUG] Found {notifications.Count} notifications");
                var response = new List<NotificationResponse>();
                foreach (var n in notifications)
                {
                    // Manually load related entities if needed
                    var hall = n.HallId.HasValue ? await _context.Halls.FindAsync(n.HallId.Value) : null;
                    var session = n.SessionId.HasValue ? await _context.Sessions.FindAsync(n.SessionId.Value) : null;
                    var createdByUser = await _context.Users.FindAsync(n.CreatedBy);
                    var broadcastByUser = !string.IsNullOrEmpty(n.BroadcastBy) ? await _context.Users.FindAsync(n.BroadcastBy) : null;

                    response.Add(new NotificationResponse
                    {
                        NotificationId = n.NotificationId,
                        Title = n.Title,
                        Content = n.Content,
                        Priority = n.Priority,
                        PriorityText = GetPriorityText(n.Priority),
                        HallId = n.HallId,
                        HallName = hall?.HallName,
                        SessionId = n.SessionId,
                        SessionNumber = session?.Session1,
                        CreatedBy = n.CreatedBy,
                        CreatedByName = createdByUser?.FullName ?? "",
                        BroadcastBy = n.BroadcastBy,
                        BroadcastByName = broadcastByUser?.FullName,
                        CreatedAt = n.CreatedAt,
                        ScheduledAt = n.ScheduledAt,
                        BroadcastAt = n.BroadcastAt,
                        Status = n.Status,
                        IsAutomatic = n.IsAutomatic,
                        RepeatCount = n.RepeatCount,
                        Scope = GetNotificationScope(n, hall, session)
                    });
                }

                return Ok(new NotificationListResponse
                {
                    Notifications = response,
                    TotalCount = response.Count, // TODO: Get actual count from service
                    PageIndex = pageIndex,
                    PageSize = pageSize,
                    TotalPages = (int)Math.Ceiling((double)response.Count / pageSize)
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error retrieving notifications", error = ex.Message });
            }
        }

        // GET: api/Notification/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<NotificationResponse>> GetNotification(int id)
        {
            try
            {
                var notification = await _notificationService.GetNotificationByIdAsync(id);
                if (notification == null)
                {
                    return NotFound(new { message = "Notification not found" });
                }

                var response = new NotificationResponse
                {
                    NotificationId = notification.NotificationId,
                    Title = notification.Title,
                    Content = notification.Content,
                    Priority = notification.Priority,
                    PriorityText = GetPriorityText(notification.Priority),
                    HallId = notification.HallId,
                    HallName = notification.Hall?.HallName,
                    SessionId = notification.SessionId,
                    SessionNumber = notification.Session?.Session1,
                    CreatedBy = notification.CreatedBy,
                    CreatedByName = notification.CreatedByUser?.FullName ?? "",
                    BroadcastBy = notification.BroadcastBy,
                    BroadcastByName = notification.BroadcastByUser?.FullName,
                    CreatedAt = notification.CreatedAt,
                    ScheduledAt = notification.ScheduledAt,
                    BroadcastAt = notification.BroadcastAt,
                    Status = notification.Status,
                    IsAutomatic = notification.IsAutomatic,
                    RepeatCount = notification.RepeatCount,
                    Scope = GetNotificationScope(notification)
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error retrieving notification", error = ex.Message });
            }
        }

        // POST: api/Notification
        [HttpPost]
        [Authorize(Roles = "MN,NO")] // Manager or Noticer can create
        public async Task<ActionResult<NotificationResponse>> CreateNotification([FromBody] CreateNotificationRequest request)
        {
            try
            {
                var notification = new Notification
                {
                    Title = request.Title,
                    Content = request.Content,
                    Priority = request.Priority,
                    HallId = request.HallId,
                    SessionId = request.SessionId,
                    ScheduledAt = request.ScheduledAt,
                    IsAutomatic = request.IsAutomatic,
                    RepeatCount = request.RepeatCount,
                    CreatedBy = GetCurrentUserId()
                };

                var createdNotification = await _notificationService.CreateNotificationAsync(notification);

                return CreatedAtAction(
                    nameof(GetNotification),
                    new { id = createdNotification.NotificationId },
                    new { message = "Notification created successfully", notificationId = createdNotification.NotificationId }
                );
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error creating notification", error = ex.Message });
            }
        }

        // PUT: api/Notification/{id}
        [HttpPut("{id}")]
        [Authorize(Roles = "MN,NO")]
        public async Task<ActionResult> UpdateNotification(int id, [FromBody] UpdateNotificationRequest request)
        {
            try
            {
                var updatedNotification = new Notification
                {
                    Title = request.Title,
                    Content = request.Content,
                    Priority = request.Priority,
                    HallId = request.HallId,
                    SessionId = request.SessionId,
                    ScheduledAt = request.ScheduledAt,
                    IsAutomatic = request.IsAutomatic,
                    RepeatCount = request.RepeatCount
                };

                var result = await _notificationService.UpdateNotificationAsync(id, updatedNotification);
                if (result == null)
                {
                    return NotFound(new { message = "Notification not found" });
                }

                return Ok(new { message = "Notification updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error updating notification", error = ex.Message });
            }
        }

        // DELETE: api/Notification/{id}
        [HttpDelete("{id}")]
        [Authorize(Roles = "MN")]
        public async Task<ActionResult> DeleteNotification(int id)
        {
            try
            {
                var result = await _notificationService.DeleteNotificationAsync(id);
                if (!result)
                {
                    return NotFound(new { message = "Notification not found" });
                }

                return Ok(new { message = "Notification deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error deleting notification", error = ex.Message });
            }
        }

        // POST: api/Notification/{id}/broadcast
        [HttpPost("{id}/broadcast")]
        [Authorize(Roles = "NO")] // Only Noticer can broadcast
        public async Task<ActionResult> StartBroadcast(int id)
        {
            try
            {
                var result = await _notificationService.StartBroadcastAsync(id, GetCurrentUserId());
                if (!result)
                {
                    return BadRequest(new { message = "Cannot start broadcast. Notification not found or not in pending status." });
                }

                return Ok(new { message = "Broadcast started successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error starting broadcast", error = ex.Message });
            }
        }

        // POST: api/Notification/{id}/complete
        [HttpPost("{id}/complete")]
        [Authorize(Roles = "NO")]
        public async Task<ActionResult> CompleteBroadcast(int id)
        {
            try
            {
                var result = await _notificationService.CompleteBroadcastAsync(id);
                if (!result)
                {
                    return BadRequest(new { message = "Cannot complete broadcast. Notification not found or not broadcasting." });
                }

                return Ok(new { message = "Broadcast completed successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error completing broadcast", error = ex.Message });
            }
        }

        // POST: api/Notification/{id}/cancel
        [HttpPost("{id}/cancel")]
        [Authorize(Roles = "MN,NO")]
        public async Task<ActionResult> CancelNotification(int id)
        {
            try
            {
                var result = await _notificationService.CancelNotificationAsync(id);
                if (!result)
                {
                    return BadRequest(new { message = "Cannot cancel notification. Notification not found or already completed." });
                }

                return Ok(new { message = "Notification cancelled successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error cancelling notification", error = ex.Message });
            }
        }

        // GET: api/Notification/pending
        [HttpGet("pending")]
        [Authorize(Roles = "NO")]
        public async Task<ActionResult<List<NotificationResponse>>> GetPendingNotifications(
            [FromQuery] int? hallId = null,
            [FromQuery] int? sessionId = null)
        {
            try
            {
                var notifications = await _notificationService.GetNotificationsByHallAndSessionAsync(hallId, sessionId);
                var response = notifications.Select(n => new NotificationResponse
                {
                    NotificationId = n.NotificationId,
                    Title = n.Title,
                    Content = n.Content,
                    Priority = n.Priority,
                    PriorityText = GetPriorityText(n.Priority),
                    HallId = n.HallId,
                    HallName = n.Hall?.HallName,
                    SessionId = n.SessionId,
                    SessionNumber = n.Session?.Session1,
                    CreatedAt = n.CreatedAt,
                    ScheduledAt = n.ScheduledAt,
                    Status = n.Status,
                    IsAutomatic = n.IsAutomatic,
                    RepeatCount = n.RepeatCount,
                    Scope = GetNotificationScope(n)
                }).ToList();

                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error retrieving pending notifications", error = ex.Message });
            }
        }

        private static string GetPriorityText(int priority)
        {
            return priority switch
            {
                1 => "High",
                2 => "Medium",
                3 => "Low",
                _ => "Medium"
            };
        }

        private static string GetNotificationScope(Notification notification, Hall? hall = null, Session? session = null)
        {
            if (notification.HallId == null && notification.SessionId == null)
                return "Toàn trường";

            if (notification.HallId != null && notification.SessionId != null)
                return $"Hall: {hall?.HallName}, Session: {session?.Session1}";

            if (notification.HallId != null)
                return $"Hall: {hall?.HallName}";

            if (notification.SessionId != null)
                return $"Session: {session?.Session1}";

            return "Toàn trường";
        }
    }
}