using System.Security.Cryptography;
using FA23_Convocation2023_API.Models;
using Microsoft.EntityFrameworkCore;

namespace FA23_Convocation2023_API.Media;

public sealed class MediaService
{
    private static readonly HashSet<string> OwnerTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "bachelor", "notification", "export", "temp"
    };

    private readonly Convo24Context _db;
    private readonly IObjectStorage _storage;
    private readonly MediaValidator _validator;
    private readonly ILogger<MediaService> _logger;

    public MediaService(Convo24Context db, IObjectStorage storage, MediaValidator validator, ILogger<MediaService> logger)
    {
        _db = db;
        _storage = storage;
        _validator = validator;
        _logger = logger;
    }

    public async Task<MediaAsset> UploadImageAsync(IFormFile file, string ownerType, string ownerId, string actorId, CancellationToken cancellationToken)
    {
        var normalizedOwner = NormalizeOwner(ownerType, ownerId);
        var image = await _validator.ValidateAndNormalizeImageAsync(file, cancellationToken);
        var mediaId = Guid.NewGuid();
        var key = BuildObjectKey(normalizedOwner.Type, normalizedOwner.Id, mediaId);
        var sha = Convert.ToHexString(SHA256.HashData(image.Bytes)).ToLowerInvariant();

        await using var stream = new MemoryStream(image.Bytes, writable: false);
        await _storage.PutAsync(key, stream, stream.Length, image.ContentType, cancellationToken);

        var asset = new MediaAsset
        {
            Id = mediaId,
            ObjectKey = key,
            OriginalName = Path.GetFileName(file.FileName),
            ContentType = image.ContentType,
            Size = image.Bytes.LongLength,
            Width = image.Width,
            Height = image.Height,
            Sha256 = sha,
            OwnerType = normalizedOwner.Type,
            OwnerId = normalizedOwner.Id,
            UploadedBy = actorId
        };

        _db.MediaAssets.Add(asset);
        _db.AuditEvents.Add(new AuditEvent
        {
            Action = "media.upload",
            ActorId = actorId,
            TargetType = nameof(MediaAsset),
            TargetId = asset.Id.ToString(),
            Details = $"owner={asset.OwnerType}:{asset.OwnerId};sha256={asset.Sha256}"
        });

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await _storage.DeleteAsync(key, cancellationToken);
            throw;
        }

        _logger.LogInformation("Media {MediaId} uploaded by {ActorId} for {OwnerType}:{OwnerId}", asset.Id, actorId, asset.OwnerType, asset.OwnerId);
        return asset;
    }

    public Task<MediaAsset?> GetAsync(Guid id, CancellationToken cancellationToken) =>
        _db.MediaAssets.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.Status == MediaAssetStatus.Active, cancellationToken);

    public Task<List<MediaAsset>> ListAsync(CancellationToken cancellationToken) =>
        _db.MediaAssets.AsNoTracking()
            .Where(x => x.Status == MediaAssetStatus.Active)
            .OrderByDescending(x => x.CreatedAt)
            .Take(1000)
            .ToListAsync(cancellationToken);

    public async Task<MediaAsset?> RenameAsync(Guid id, string originalName, string actorId, CancellationToken cancellationToken)
    {
        var asset = await _db.MediaAssets.FirstOrDefaultAsync(x => x.Id == id && x.Status == MediaAssetStatus.Active, cancellationToken);
        if (asset is null) return null;
        var safeName = Path.GetFileName(originalName).Trim();
        if (safeName.Length is < 1 or > 255) throw new MediaValidationException("Invalid display filename.");
        asset.OriginalName = safeName;
        _db.AuditEvents.Add(new AuditEvent { Action = "media.rename", ActorId = actorId, TargetType = nameof(MediaAsset), TargetId = id.ToString() });
        await _db.SaveChangesAsync(cancellationToken);
        return asset;
    }

    public async Task<string?> GetDownloadUrlAsync(Guid id, CancellationToken cancellationToken)
    {
        var asset = await GetAsync(id, cancellationToken);
        if (asset is null) return null;
        await _storage.StatAsync(asset.ObjectKey, cancellationToken);
        return await _storage.PresignGetAsync(asset.ObjectKey);
    }

    public async Task<bool> SoftDeleteAsync(Guid id, string actorId, CancellationToken cancellationToken)
    {
        var asset = await _db.MediaAssets.FirstOrDefaultAsync(x => x.Id == id && x.Status == MediaAssetStatus.Active, cancellationToken);
        if (asset is null) return false;
        asset.Status = MediaAssetStatus.Deleted;
        asset.DeletedAt = DateTimeOffset.UtcNow;
        _db.AuditEvents.Add(new AuditEvent
        {
            Action = "media.delete",
            ActorId = actorId,
            TargetType = nameof(MediaAsset),
            TargetId = id.ToString()
        });
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public static string BuildObjectKey(string ownerType, string ownerId, Guid mediaId) => ownerType.ToLowerInvariant() switch
    {
        "bachelor" => $"bachelors/{ownerId}/avatar/{mediaId:N}.webp",
        "notification" => $"notifications/{ownerId}/{mediaId:N}.webp",
        "export" => $"exports/{ownerId}/{mediaId:N}.webp",
        _ => $"temp/{ownerId}/{mediaId:N}.webp"
    };

    private static (string Type, string Id) NormalizeOwner(string ownerType, string ownerId)
    {
        var type = ownerType.Trim().ToLowerInvariant();
        if (!OwnerTypes.Contains(type)) throw new MediaValidationException("Unsupported media owner type.");
        if (ownerId.Length is < 1 or > 64 || ownerId.Any(c => !char.IsLetterOrDigit(c) && c != '-'))
            throw new MediaValidationException("Invalid media owner identifier.");
        return (type, ownerId);
    }
}
