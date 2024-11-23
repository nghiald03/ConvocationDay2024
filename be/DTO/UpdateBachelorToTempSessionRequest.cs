using System;
using System.ComponentModel.DataAnnotations;

namespace FA23_Convocation2023_API.DTO;

public class UpdateBachelorToTempSessionRequest
{
    [Required]
    public bool IsMorning { get; set; }
}
