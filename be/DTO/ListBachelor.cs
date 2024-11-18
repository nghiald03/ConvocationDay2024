namespace FA23_Convocation2023_API.DTO
{
    public class ListBachelor
    {
        public int Id { get; set; }

        public string StudentCode { get; set; } = null!;

        public string FullName { get; set; } = null!;

        public string? Mail { get; set; }

        public string? Faculty { get; set; }

        public string? Major { get; set; }

        public string? Image { get; set; }

        public bool? Status { get; set; }

        public string? StatusBaChelor { get; set; }

        public string? HallName { get; set; }

        public int? SessionNum { get; set; }

        public string? Chair { get; set; }

        public string? ChairParent { get; set; }

        public bool? CheckIn { get; set; }

        public DateTime? TimeCheckIn { get; set; }
    }
}
