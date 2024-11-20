namespace FA23_Convocation2023_API.DTO;

public class AddBachelorResponse
{
    public List<string> ErrorMessages { get; set; } = new List<string>();
    public List<BachelorDTO> SuccessfulBachelors { get; set; } = new List<BachelorDTO>();
}
