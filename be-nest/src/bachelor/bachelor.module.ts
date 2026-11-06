import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { BachelorController } from './bachelor.controller.js';
import { BachelorImportService } from './bachelor-import.service.js';
import { BachelorService } from './bachelor.service.js';

@Module({
  imports: [RealtimeModule],
  controllers: [BachelorController],
  providers: [BachelorService, BachelorImportService],
  exports: [BachelorService],
})
export class BachelorModule {}
