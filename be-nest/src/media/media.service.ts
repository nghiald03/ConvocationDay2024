import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { basename } from 'node:path';
import { desc, eq, and } from 'drizzle-orm';
import { DATABASE } from '../database/database.constants.js';
import type { AppDatabase } from '../database/database.types.js';
import { mediaAssets } from '../database/schema/media-schema.js';
import { MediaValidatorService } from './media-validator.service.js';
import { ObjectStorageService } from './object-storage.service.js';

const ownerTypes = new Set(['bachelor', 'notification', 'export', 'temp']);

@Injectable()
export class MediaService {
  constructor(
    @Inject(DATABASE) private readonly database: AppDatabase,
    private readonly storage: ObjectStorageService,
    private readonly validator: MediaValidatorService,
  ) {}

  async upload(file: Express.Multer.File, ownerType: string, ownerId: string, actorId: string) {
    const owner = this.normalizeOwner(ownerType, ownerId);
    const image = await this.validator.validateAndNormalize(file);
    const id = randomUUID();
    const objectKey = this.objectKey(owner.type, owner.id, id);
    const sha256 = createHash('sha256').update(image.bytes).digest('hex');
    await this.storage.put(objectKey, image.bytes, image.contentType);
    try {
      const [asset] = await this.database
        .insert(mediaAssets)
        .values({
          id,
          objectKey,
          originalName: basename(file.originalname),
          contentType: image.contentType,
          size: image.bytes.length,
          width: image.width,
          height: image.height,
          sha256,
          ownerType: owner.type,
          ownerId: owner.id,
          uploadedBy: actorId,
        })
        .returning();
      return asset!;
    } catch (error) {
      await this.storage.delete(objectKey);
      throw error;
    }
  }

  async uploadMany(
    files: Express.Multer.File[],
    ownerType: string,
    ownerId: string,
    actorId: string,
  ) {
    const uploaded: (typeof mediaAssets.$inferSelect)[] = [];
    try {
      for (const file of files) {
        uploaded.push(await this.upload(file, ownerType, ownerId, actorId));
      }
      return uploaded;
    } catch (error) {
      await Promise.allSettled(uploaded.map((asset) => this.rollbackUpload(asset)));
      throw error;
    }
  }

  async get(id: string) {
    const [asset] = await this.database
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.id, id), eq(mediaAssets.status, 0)))
      .limit(1);
    return asset ?? null;
  }

  list() {
    return this.database
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.status, 0))
      .orderBy(desc(mediaAssets.createdAt))
      .limit(1000);
  }

  async rename(id: string, originalName: string) {
    const safeName = basename(originalName).trim();
    if (safeName.length < 1 || safeName.length > 255) {
      throw new BadRequestException({
        code: 'media/invalid-name',
        message: 'Tên hiển thị của tệp không hợp lệ.',
      });
    }
    const [asset] = await this.database
      .update(mediaAssets)
      .set({ originalName: safeName })
      .where(and(eq(mediaAssets.id, id), eq(mediaAssets.status, 0)))
      .returning();
    return asset ?? null;
  }

  async downloadUrl(id: string): Promise<string | null> {
    const asset = await this.get(id);
    if (!asset) return null;
    await this.storage.stat(asset.objectKey);
    return this.storage.presignGet(asset.objectKey);
  }

  async softDelete(id: string): Promise<boolean> {
    const rows = await this.database
      .update(mediaAssets)
      .set({ status: 1, deletedAt: new Date() })
      .where(and(eq(mediaAssets.id, id), eq(mediaAssets.status, 0)))
      .returning();
    return rows.length > 0;
  }

  toDto(asset: typeof mediaAssets.$inferSelect) {
    return {
      id: asset.id,
      originalName: asset.originalName,
      contentType: asset.contentType,
      mimeType: asset.contentType,
      path: `/backend-api/media/${asset.id}/content`,
      size: asset.size,
      width: asset.width,
      height: asset.height,
      ownerType: asset.ownerType,
      ownerId: asset.ownerId,
      createdAt: asset.createdAt,
    };
  }

  objectKey(ownerType: string, ownerId: string, mediaId: string): string {
    const compactId = mediaId.replaceAll('-', '');
    if (ownerType === 'bachelor') return `bachelors/${ownerId}/avatar/${compactId}.webp`;
    if (ownerType === 'notification') return `notifications/${ownerId}/${compactId}.webp`;
    if (ownerType === 'export') return `exports/${ownerId}/${compactId}.webp`;
    return `temp/${ownerId}/${compactId}.webp`;
  }

  private normalizeOwner(ownerType: string, ownerId: string) {
    const type = ownerType.trim().toLowerCase();
    if (!ownerTypes.has(type)) {
      throw new BadRequestException({
        code: 'media/invalid-owner',
        message: 'Loại đối tượng sở hữu tệp không được hỗ trợ.',
      });
    }
    if (!/^[a-zA-Z0-9-]{1,64}$/.test(ownerId)) {
      throw new BadRequestException({
        code: 'media/invalid-owner',
        message: 'Mã đối tượng sở hữu tệp không hợp lệ.',
      });
    }
    return { type, id: ownerId };
  }

  private async rollbackUpload(asset: typeof mediaAssets.$inferSelect): Promise<void> {
    await Promise.allSettled([
      this.storage.delete(asset.objectKey),
      this.database.delete(mediaAssets).where(eq(mediaAssets.id, asset.id)),
    ]);
  }
}
