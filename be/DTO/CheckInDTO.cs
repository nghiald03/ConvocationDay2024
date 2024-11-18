namespace FA23_Convocation2023_API.DTO
{
    public class CheckInDTO
    {
        public int CheckinId { get; set; }
        public string HallName { get; set; }
        public int? SessionNum { get; set; }
        public bool? Status { get; set; }
    }
}
