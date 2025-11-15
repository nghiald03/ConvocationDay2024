namespace FA23_Convocation2023_API.DTO;

public class BachelorResponseDTO
{
    public int Id { get; set; }
    public string FullName { get; set; }
    public string StudentCode { get; set; }
    public string Mail { get; set; }
    public string Major { get; set; }
    public string HallName { get; set; }

    public int SessionNum { get; set; }
    public int? SessionInDay { get; set; }
    // Other properties you want to return
}