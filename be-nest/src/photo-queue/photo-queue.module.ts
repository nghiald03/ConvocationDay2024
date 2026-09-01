import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { PhotoQueueController } from './photo-queue.controller.js';
import { PhotoQueueService } from './photo-queue.service.js';

@Module({
  imports: [RealtimeModule],
  controllers: [PhotoQueueController],
  providers: [PhotoQueueService],
})
export class PhotoQueueModule {}
