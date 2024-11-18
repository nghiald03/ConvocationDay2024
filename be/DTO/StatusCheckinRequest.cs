namespace FA23_Convocation2023_API.DTO
{
    public class StatusCheckinRequest
    {
        public int HallId {  get; set; }
        public int SessionId {  get; set; }
        public bool Status {  get; set; }
    }
}
