using System;

namespace FA23_Convocation2023_API.DTO;

public class UpdateBachelorToTempSessionRequest
{
    public string StudentCode { get; set; }
    public bool IsMorning { get; set; }
}
