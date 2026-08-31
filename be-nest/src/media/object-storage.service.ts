import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Readable } from 'node:stream';

@Injectable()
export class ObjectStorageService {
  private readonly internalClient: S3Client;
  private readonly publicClient: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    const credentials = {
      accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY'),
      secretAccessKey: config.getOrThrow<string>('S3_SECRET_KEY'),
    };
    const shared = { region: 'us-east-1', credentials, forcePathStyle: true } as const;
    this.internalClient = new S3Client({
      ...shared,
      endpoint: config.getOrThrow<string>('S3_ENDPOINT'),
    });
    this.publicClient = new S3Client({
      ...shared,
      endpoint: config.getOrThrow<string>('S3_PUBLIC_ENDPOINT'),
    });
    this.bucket = config.getOrThrow<string>('S3_BUCKET');
  }

  async ensureBucket(): Promise<void> {
    try {
      await this.internalClient.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.internalClient.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async ready(): Promise<void> {
    await this.internalClient.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.internalClient.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentLength: body.length,
        ContentType: contentType,
      }),
    );
  }

  async stat(key: string): Promise<void> {
    await this.internalClient.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async getStream(key: string): Promise<Readable> {
    const result = await this.internalClient.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!result.Body || typeof result.Body === 'string' || !('pipe' in result.Body)) {
      throw new Error('MinIO không trả về luồng dữ liệu hợp lệ.');
    }
    return result.Body;
  }

  async presignGet(key: string, expiresIn = 300): Promise<string> {
    return getSignedUrl(
      this.publicClient,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: Math.max(30, Math.min(900, expiresIn)) },
    );
  }

  async delete(key: string): Promise<void> {
    await this.internalClient.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
