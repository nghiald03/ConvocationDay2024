import { BadRequestException, Injectable } from '@nestjs/common';
import sharp from 'sharp';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_REQUEST_BYTES = 25 * 1024 * 1024;
export const MAX_PIXELS = 25_000_000;
export const MAX_BULK_FILES = 20;

export interface ValidatedImage {
  bytes: Buffer;
  width: number;
  height: number;
  contentType: 'image/webp';
}

@Injectable()
export class MediaValidatorService {
  async validateAndNormalize(file: Express.Multer.File): Promise<ValidatedImage> {
    if (file.size < 1 || file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException({
        code: 'media/invalid-image',
        message: 'Kích thước ảnh phải từ 1 byte đến 10 MB.',
      });
    }

    try {
      const image = sharp(file.buffer, {
        failOn: 'error',
        limitInputPixels: MAX_PIXELS,
        sequentialRead: true,
      });
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height || metadata.width * metadata.height > MAX_PIXELS) {
        throw new Error('dimensions');
      }
      const bytes = await image.rotate().webp({ quality: 85 }).toBuffer();
      return {
        bytes,
        width: metadata.width,
        height: metadata.height,
        contentType: 'image/webp',
      };
    } catch {
      throw new BadRequestException({
        code: 'media/invalid-image',
        message: 'Chỉ chấp nhận tệp ảnh raster có thể giải mã và kích thước hợp lệ.',
      });
    }
  }
}
