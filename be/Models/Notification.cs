using System;
using System.Collections.Generic;

namespace FA23_Convocation2023_API.Models
{
    public partial class Notification
    {
        public int NotificationId { get; set; }
        public string Title { get; set; }
        public string Content { get; set; }
        public int Priority { get; set; } // 1=High, 2=Medium, 3=Low
        public int? HallId { get; set; } // Null = toàn trường
        public int? SessionId { get; set; } // Null = tất cả session
        public string CreatedBy { get; set; } // UserId tạo thông báo
        public string? BroadcastBy { get; set; } // UserId phát thông báo
        public DateTime CreatedAt { get; set; }
        public DateTime? ScheduledAt { get; set; } // Thời gian lên lịch (optional)
        public DateTime? BroadcastAt { get; set; } // Thời gian phát thực tế
        public string Status { get; set; } // PENDING, BROADCASTING, COMPLETED, CANCELLED
        public bool IsAutomatic { get; set; } // true = tự động theo session, false = manual
        public int RepeatCount { get; set; } = 1; // Số lần lặp lại thông báo (mặc định = 1)

        // Navigation properties
        public virtual Hall Hall { get; set; }
        public virtual Session Session { get; set; }
        public virtual User CreatedByUser { get; set; }
        public virtual User BroadcastByUser { get; set; }
    }
}