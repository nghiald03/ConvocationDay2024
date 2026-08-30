using System.Security.Cryptography;
using System.Text.Json;
using FA23_Convocation2023_API.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace FA23_Convocation2023_API.Media;

public sealed record LegacyMediaMigrationItem(string Path, string Status, Guid? MediaId = null, string? Message = null);
public sealed record LegacyMediaMigrationReport(DateTimeOffset StartedAt, DateTimeOffset CompletedAt, bool DryRun, IReadOnlyList<LegacyMediaMigrationItem> Items);

public sealed class LegacyMediaMigrationService
{
    private readonly Convo24Context _db;
    private readonly MediaService _media;
    private readonly IObjectStorage _storage;
    private readonly IConfiguration _configuration;
    private readonly ILogger<LegacyMediaMigrationService> _logger;

    public LegacyMediaMigrationService(Convo24Context db, MediaService media, IObjectStorage storage, IConfiguration configuration, ILogger<LegacyMediaMigrationService> logger)
    {
        _db = db;
        _media = media;
        _storage = storage;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<LegacyMediaMigrationReport> RunAsync(bool dryRun, CancellationToken cancellationToken = default)
    {
        var startedAt = DateTimeOffset.UtcNow;
        var items = new List<LegacyMediaMigrationItem>();
        var configuredRoots = _configuration.GetSection("LegacyMedia:Roots").Get<string[]>() ?? Array.Empty<string>();

        foreach (var configuredRoot in configuredRoots)
        {
            var root = Path.GetFullPath(configuredRoot);
            if (!Directory.Exists(root))
            {
                items.Add(new LegacyMediaMigrationItem(root, "missing", Message: "Configured root does not exist."));
                continue;
            }

            foreach (var candidate in Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories))
            {
                cancellationToken.ThrowIfCancellationRequested();
                var fullPath = Path.GetFullPath(candidate);
                var relativePath = Path.GetRelativePath(root, fullPath).Replace('\\', '/');
                var mappingKey = $"{Path.GetFileName(root)}/{relativePath}";
                try
                {
                    if (!fullPath.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
                        throw new MediaValidationException("Path escapes the configured migration root.");
                    if ((File.GetAttributes(fullPath) & FileAttributes.ReparsePoint) != 0)
                        throw new MediaValidationException("Symbolic links and reparse points are rejected.");

                    var mapped = await _db.LegacyMediaMappings.AsNoTracking().FirstOrDefaultAsync(x => x.OldPath == mappingKey, cancellationToken);
                    if (mapped is not null)
                    {
                        items.Add(new LegacyMediaMigrationItem(mappingKey, "duplicate", mapped.MediaId));
                        continue;
                    }

                    if (dryRun)
                    {
                        items.Add(new LegacyMediaMigrationItem(mappingKey, "validated"));
                        continue;
                    }

                    await using var stream = File.OpenRead(fullPath);
                    var formFile = new FormFile(stream, 0, stream.Length, "image", Path.GetFileName(fullPath));
                    var asset = await _media.UploadImageAsync(formFile, "temp", "migration", "legacy-media-migrator", cancellationToken);
                    var downloaded = await _storage.GetAsync(asset.ObjectKey, cancellationToken);
                    var verifiedHash = Convert.ToHexString(SHA256.HashData(downloaded)).ToLowerInvariant();
                    if (!string.Equals(verifiedHash, asset.Sha256, StringComparison.Ordinal))
                        throw new InvalidDataException("Object checksum verification failed.");

                    _db.LegacyMediaMappings.Add(new LegacyMediaMapping
                    {
                        OldPath = mappingKey,
                        MediaId = asset.Id,
                        Sha256 = asset.Sha256
                    });
                    await _db.SaveChangesAsync(cancellationToken);
                    items.Add(new LegacyMediaMigrationItem(mappingKey, "success", asset.Id));
                }
                catch (Exception exception)
                {
                    _logger.LogError(exception, "Legacy media migration failed for {Path}", mappingKey);
                    items.Add(new LegacyMediaMigrationItem(mappingKey, "failure", Message: exception.Message));
                }
            }
        }

        return new LegacyMediaMigrationReport(startedAt, DateTimeOffset.UtcNow, dryRun, items);
    }

    public static async Task WriteReportAsync(LegacyMediaMigrationReport report, string path, CancellationToken cancellationToken = default)
    {
        var json = JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(path, json, cancellationToken);
    }
}
