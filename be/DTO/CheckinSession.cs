namespace FA23_Convocation2023_API.DTO
{
    public class CheckinSession
    {
        public string HallName { get; set; }
        public int SessionNum { get; set; }
        public int BachelorsCheckined {  get; set; }
        public int BachelorsSession {  get; set; }
        public string? Status { get; set; }
    }
}
