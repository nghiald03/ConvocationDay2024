namespace FA23_Convocation2023_API.DTO
{
    public class SessionHallSummaryDto
    {
        public int SessionId { get; set; }
        public int? SessionNumber { get; set; }

        public int HallId { get; set; }
        public string HallName { get; set; }

        public int TotalStudents { get; set; }
        public int CheckedInCount { get; set; }
    }
}
