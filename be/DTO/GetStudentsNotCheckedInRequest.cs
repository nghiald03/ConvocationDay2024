namespace FA23_Convocation2023_API.DTO
{
    public class GetStudentsNotCheckedInRequest
    {
        public int? HallId { get; set; }
        public int? SessionId { get; set; }
        public string? KeySearch { get; set; }
        public int PageIndex { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }
}