using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;

namespace FA23_Convocation2023_API.Media;

public sealed class ObjectStorageOptions
{
    public const string SectionName = "S3";
    public string Endpoint { get; set; } = string.Empty;
    public string PublicEndpoint { get; set; } = string.Empty;
    public string Bucket { get; set; } = "convocation";
    public string AccessKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public bool UseSsl { get; set; }
}

public interface IObjectStorage
{
    Task EnsureBucketAsync(CancellationToken cancellationToken = default);
    Task PutAsync(string key, Stream content, long size, string contentType, CancellationToken cancellationToken = default);
    Task StatAsync(string key, CancellationToken cancellationToken = default);
    Task<byte[]> GetAsync(string key, CancellationToken cancellationToken = default);
    Task<string> PresignGetAsync(string key, int expirySeconds = 300);
    Task DeleteAsync(string key, CancellationToken cancellationToken = default);
}

public sealed class MinioObjectStorage : IObjectStorage
{
    private readonly IMinioClient _client;
    private readonly IMinioClient _publicClient;
    private readonly ObjectStorageOptions _options;

    public MinioObjectStorage(IOptions<ObjectStorageOptions> options)
    {
        _options = options.Value;
        Validate(_options);
        _client = BuildClient(_options.Endpoint, _options);
        _publicClient = BuildClient(
            string.IsNullOrWhiteSpace(_options.PublicEndpoint) ? _options.Endpoint : _options.PublicEndpoint,
            _options);
    }

    public async Task EnsureBucketAsync(CancellationToken cancellationToken = default)
    {
        var exists = await _client.BucketExistsAsync(
            new BucketExistsArgs().WithBucket(_options.Bucket), cancellationToken);
        if (!exists)
        {
            await _client.MakeBucketAsync(
                new MakeBucketArgs().WithBucket(_options.Bucket), cancellationToken);
        }
    }

    public Task PutAsync(string key, Stream content, long size, string contentType, CancellationToken cancellationToken = default) =>
        _client.PutObjectAsync(new PutObjectArgs()
            .WithBucket(_options.Bucket)
            .WithObject(key)
            .WithStreamData(content)
            .WithObjectSize(size)
            .WithContentType(contentType), cancellationToken);

    public async Task StatAsync(string key, CancellationToken cancellationToken = default) =>
        await _client.StatObjectAsync(new StatObjectArgs()
            .WithBucket(_options.Bucket)
            .WithObject(key), cancellationToken);

    public async Task<byte[]> GetAsync(string key, CancellationToken cancellationToken = default)
    {
        await using var output = new MemoryStream();
        await _client.GetObjectAsync(new GetObjectArgs()
            .WithBucket(_options.Bucket)
            .WithObject(key)
            .WithCallbackStream(stream => stream.CopyToAsync(output, cancellationToken)), cancellationToken);
        return output.ToArray();
    }

    public Task<string> PresignGetAsync(string key, int expirySeconds = 300) =>
        _publicClient.PresignedGetObjectAsync(new PresignedGetObjectArgs()
            .WithBucket(_options.Bucket)
            .WithObject(key)
            .WithExpiry(Math.Clamp(expirySeconds, 30, 900)));

    public Task DeleteAsync(string key, CancellationToken cancellationToken = default) =>
        _client.RemoveObjectAsync(new RemoveObjectArgs()
            .WithBucket(_options.Bucket)
            .WithObject(key), cancellationToken);

    private static IMinioClient BuildClient(string endpoint, ObjectStorageOptions options)
    {
        var uri = new Uri(endpoint);
        var builder = new MinioClient()
            .WithEndpoint(uri.Host, uri.IsDefaultPort ? (uri.Scheme == "https" ? 443 : 80) : uri.Port)
            .WithCredentials(options.AccessKey, options.SecretKey);
        if (uri.Scheme == "https" || options.UseSsl) builder = builder.WithSSL();
        return builder.Build();
    }

    private static void Validate(ObjectStorageOptions options)
    {
        if (!Uri.TryCreate(options.Endpoint, UriKind.Absolute, out _) ||
            string.IsNullOrWhiteSpace(options.AccessKey) ||
            string.IsNullOrWhiteSpace(options.SecretKey) ||
            string.IsNullOrWhiteSpace(options.Bucket))
        {
            throw new InvalidOperationException("S3 endpoint, bucket and credentials must be provided by server configuration.");
        }
    }
}
