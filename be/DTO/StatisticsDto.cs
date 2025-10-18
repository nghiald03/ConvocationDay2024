namespace FA23_Convocation2023_API.DTO
{
    public class HallCheckInDto
    {
        public int HallId { get; set; }
        public string HallName { get; set; }
        public int TotalCheckIn { get; set; }
    }

    public class SessionStatisticDto
    {
        public int SessionId { get; set; }
        public int? SessionNumber { get; set; }
        public int TotalCheckIn { get; set; }
        public int TotalHalls { get; set; }
        public List<HallCheckInDto> Halls { get; set; } = new();
    }

    public class StatisticsDto
    {
        public int TotalSessions { get; set; }
        public int TotalHalls { get; set; }
        public int TotalCheckIn { get; set; }
        // Danh sách thống kê từng session
        public List<SessionStatisticDto> Sessions { get; set; } = new();
    }
}
