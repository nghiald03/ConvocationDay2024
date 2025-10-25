using System.ComponentModel.DataAnnotations;

namespace FA23_Convocation2023_API.DTO
{
    public class CreateNotificationRequest
    {
        [Required]
        [MaxLength(200)]
        public string Title { get; set; }

        [Required]
        [MaxLength(1000)]
        public string Content { get; set; }

        [Range(1, 3)]
        public int Priority { get; set; } = 2; // Default: Medium

        public int? HallId { get; set; } // Null = toàn trường

        public int? SessionId { get; set; } // Null = tất cả session

        public DateTime? ScheduledAt { get; set; } // Null = immediate

        public bool IsAutomatic { get; set; } = false;

        [Range(1, 10)]
        public int RepeatCount { get; set; } = 1; // Số lần lặp lại (1-10)
    }

    public class UpdateNotificationRequest
    {
        [Required]
        [MaxLength(200)]
        public string Title { get; set; }

        [Required]
        [MaxLength(1000)]
        public string Content { get; set; }

        [Range(1, 3)]
        public int Priority { get; set; }

        public int? HallId { get; set; }

        public int? SessionId { get; set; }

        public DateTime? ScheduledAt { get; set; }

        public bool IsAutomatic { get; set; }

        [Range(1, 10)]
        public int RepeatCount { get; set; } = 1; // Số lần lặp lại (1-10)
    }

    public class NotificationResponse
    {
        public int NotificationId { get; set; }
        public string Title { get; set; }
        public string Content { get; set; }
        public int Priority { get; set; }
        public string PriorityText { get; set; } // "High", "Medium", "Low"
        public int? HallId { get; set; }
        public string? HallName { get; set; }
        public int? SessionId { get; set; }
        public int? SessionNumber { get; set; }
        public string CreatedBy { get; set; }
        public string CreatedByName { get; set; }
        public string? BroadcastBy { get; set; }
        public string? BroadcastByName { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ScheduledAt { get; set; }
        public DateTime? BroadcastAt { get; set; }
        public string Status { get; set; }
        public bool IsAutomatic { get; set; }
        public int RepeatCount { get; set; } // Số lần lặp lại
        public string Scope { get; set; } // "Toàn trường", "Hall: {name}", "Session: {number}"
    }

    public class BroadcastRequest
    {
        [Required]
        public int NotificationId { get; set; }
    }

    public class NotificationListResponse
    {
        public List<NotificationResponse> Notifications { get; set; }
        public int TotalCount { get; set; }
        public int PageIndex { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }
}