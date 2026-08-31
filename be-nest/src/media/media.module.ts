import { Module, type OnModuleInit } from '@nestjs/common';
import { MediaController } from './media.controller.js';
import { MediaService } from './media.service.js';
import { MediaValidatorService } from './media-validator.service.js';
import { ObjectStorageService } from './object-storage.service.js';

@Module({
  controllers: [MediaController],
  providers: [MediaService, MediaValidatorService, ObjectStorageService],
  exports: [MediaService, ObjectStorageService],
})
export class MediaModule implements OnModuleInit {
  constructor(private readonly storage: ObjectStorageService) {}

  async onModuleInit(): Promise<void> {
    await this.storage.ensureBucket();
  }
}
