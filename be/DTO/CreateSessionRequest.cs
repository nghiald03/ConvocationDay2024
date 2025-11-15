namespace FA23_Convocation2023_API.DTO
{
    public class CreateSessionRequest
    {
        public int SessionNum { get; set; }
        public int? SessionInDay { get; set; }
        public string? Description { get; set; }
    }
}
