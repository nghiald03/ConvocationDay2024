using System.Security.Claims;
using FA23_Convocation2023_API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FA23_Convocation2023_API.Media;

[ApiController]
[Route("api/media")]
[Authorize(Policy = Permissions.ManageMedia)]
public sealed class MediaController : ControllerBase
{
    private readonly MediaService _media;

    public MediaController(MediaService media) => _media = media;

    [HttpPost("images")]
    [RequestSizeLimit(MediaValidator.MaxRequestBytes)]
    [ValidateAntiforgeryToken]
    public async Task<IActionResult> UploadImage(IFormFile image, [FromForm] string? ownerType, [FromForm] string? ownerId, CancellationToken cancellationToken)
    {
        try
        {
            var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var asset = await _media.UploadImageAsync(image, ownerType ?? "temp", ownerId ?? actorId, actorId, cancellationToken);
            return CreatedAtAction(nameof(Get), new { id = asset.Id }, ToDto(asset));
        }
        catch (MediaValidationException exception)
        {
            return BadRequest(new { code = "media/invalid-image", message = exception.Message });
        }
    }

    [HttpPost("images/bulk")]
    [RequestSizeLimit(MediaValidator.MaxRequestBytes)]
    [ValidateAntiforgeryToken]
    public async Task<IActionResult> UploadImages(List<IFormFile> images, [FromForm] string? ownerType, [FromForm] string? ownerId, CancellationToken cancellationToken)
    {
        if (images.Count == 0) return BadRequest(new { code = "media/no-files" });
        try
        {
            var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var uploaded = new List<object>();
            foreach (var image in images)
            {
                var asset = await _media.UploadImageAsync(image, ownerType ?? "temp", ownerId ?? actorId, actorId, cancellationToken);
                uploaded.Add(ToDto(asset));
            }
            return Created("/api/media", uploaded);
        }
        catch (MediaValidationException exception)
        {
            return BadRequest(new { code = "media/invalid-image", message = exception.Message });
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken)
    {
        var asset = await _media.GetAsync(id, cancellationToken);
        return asset is null ? NotFound() : Ok(ToDto(asset));
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken) =>
        Ok((await _media.ListAsync(cancellationToken)).Select(ToDto));

    [HttpGet("{id:guid}/download")]
    public async Task<IActionResult> Download(Guid id, CancellationToken cancellationToken)
    {
        var url = await _media.GetDownloadUrlAsync(id, cancellationToken);
        return url is null ? NotFound() : Ok(new { url, expiresInSeconds = 300 });
    }

    [HttpGet("{id:guid}/content")]
    public async Task<IActionResult> Content(Guid id, CancellationToken cancellationToken)
    {
        var url = await _media.GetDownloadUrlAsync(id, cancellationToken);
        return url is null ? NotFound() : Redirect(url);
    }

    [HttpPatch("{id:guid}")]
    [ValidateAntiforgeryToken]
    public async Task<IActionResult> Rename(Guid id, RenameMediaRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var asset = await _media.RenameAsync(id, request.OriginalName, User.FindFirstValue(ClaimTypes.NameIdentifier)!, cancellationToken);
            return asset is null ? NotFound() : Ok(ToDto(asset));
        }
        catch (MediaValidationException exception)
        {
            return BadRequest(new { code = "media/invalid-name", message = exception.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    [ValidateAntiforgeryToken]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken) =>
        await _media.SoftDeleteAsync(id, User.FindFirstValue(ClaimTypes.NameIdentifier)!, cancellationToken)
            ? NoContent()
            : NotFound();

    [HttpDelete]
    [ValidateAntiforgeryToken]
    public async Task<IActionResult> DeleteMany(DeleteMediaRequest request, CancellationToken cancellationToken)
    {
        var actor = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var deleted = new List<Guid>();
        foreach (var id in request.Ids.Distinct().Take(100))
            if (await _media.SoftDeleteAsync(id, actor, cancellationToken)) deleted.Add(id);
        return Ok(new { deleted });
    }

    private static object ToDto(MediaAsset asset) => new
    {
        asset.Id,
        asset.OriginalName,
        asset.ContentType,
        mimeType = asset.ContentType,
        path = $"/backend-api/media/{asset.Id}/content",
        asset.Size,
        asset.Width,
        asset.Height,
        asset.OwnerType,
        asset.OwnerId,
        asset.CreatedAt
    };
}

public sealed record RenameMediaRequest(string OriginalName);
public sealed record DeleteMediaRequest(IReadOnlyCollection<Guid> Ids);
