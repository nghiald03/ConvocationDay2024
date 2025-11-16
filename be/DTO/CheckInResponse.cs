namespace FA23_Convocation2023_API.DTO
{
    public class CheckInResponse
    {
        public int CheckinId { get; set; }
        public bool? Status { get; set; }

        public int HallId { get; set; }
        public string HallName { get; set; }

        public int SessionId { get; set; }
        public int? SessionNumber { get; set; }
        public int? SessionInDay { get; set; }
        public string? SessionDescription { get; set; }
    }
}
