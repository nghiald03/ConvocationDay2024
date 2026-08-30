using SixLabors.ImageSharp;

namespace FA23_Convocation2023_API.Media;

public sealed class MediaValidationException : Exception
{
    public MediaValidationException(string message) : base(message) { }
}

public sealed record ValidatedImage(byte[] Bytes, int Width, int Height, string ContentType);

public sealed class MediaValidator
{
    public const long MaxImageBytes = 10 * 1024 * 1024;
    public const long MaxRequestBytes = 25 * 1024 * 1024;
    public const long MaxPixels = 25_000_000;

    public async Task<ValidatedImage> ValidateAndNormalizeImageAsync(IFormFile file, CancellationToken cancellationToken)
    {
        if (file.Length <= 0 || file.Length > MaxImageBytes)
            throw new MediaValidationException("Image size must be between 1 byte and 10 MB.");

        await using var input = file.OpenReadStream();
        Image image;
        try
        {
            image = await Image.LoadAsync(input, cancellationToken);
        }
        catch (UnknownImageFormatException)
        {
            throw new MediaValidationException("Only decodable raster images are accepted.");
        }

        using (image)
        {
            if ((long)image.Width * image.Height > MaxPixels)
                throw new MediaValidationException("Decoded image dimensions are too large.");

            await using var output = new MemoryStream();
            await image.SaveAsWebpAsync(output, cancellationToken);
            return new ValidatedImage(output.ToArray(), image.Width, image.Height, "image/webp");
        }
    }
}
