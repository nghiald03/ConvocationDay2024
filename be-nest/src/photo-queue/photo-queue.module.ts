import { Module } from '@nestjs/common';
import { PhotoQueueController } from './photo-queue.controller.js';
import { PhotoQueueService } from './photo-queue.service.js';

@Module({
  controllers: [PhotoQueueController],
  providers: [PhotoQueueService],
})
export class PhotoQueueModule {}
