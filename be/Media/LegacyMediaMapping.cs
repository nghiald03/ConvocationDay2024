namespace FA23_Convocation2023_API.Media;

public sealed class LegacyMediaMapping
{
    public long Id { get; set; }
    public string OldPath { get; set; } = string.Empty;
    public Guid MediaId { get; set; }
    public string Sha256 { get; set; } = string.Empty;
    public DateTimeOffset MigratedAt { get; set; } = DateTimeOffset.UtcNow;
    public MediaAsset Media { get; set; } = null!;
}
