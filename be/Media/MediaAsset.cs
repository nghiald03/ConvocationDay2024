namespace FA23_Convocation2023_API.Media;

public enum MediaAssetStatus
{
    Active = 0,
    Deleted = 1,
    Pending = 2
}

public sealed class MediaAsset
{
    public Guid Id { get; set; }
    public string ObjectKey { get; set; } = string.Empty;
    public string OriginalName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long Size { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public string Sha256 { get; set; } = string.Empty;
    public string OwnerType { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public MediaAssetStatus Status { get; set; } = MediaAssetStatus.Active;
    public string UploadedBy { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? DeletedAt { get; set; }
}
