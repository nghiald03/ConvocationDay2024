namespace FA23_Convocation2023_API.DTO
{
    public class HallSessionSummaryDto
    {
        public int SessionId { get; set; }
        public int? SessionNumber { get; set; }
        public int TotalStudents { get; set; }
        public int CheckedInCount { get; set; }
    }

    public class HallOverviewDto
    {
        public int HallId { get; set; }
        public string HallName { get; set; }
        public int TotalSessions { get; set; }

        public List<HallSessionSummaryDto> Sessions { get; set; } = new();

        // Xác định session hiện tại (mới nhất hoặc đang LED)
        public int? CurrentSessionId { get; set; }
        public int? CurrentSessionNumber { get; set; }
    }
}
