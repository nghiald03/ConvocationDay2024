import { Module } from '@nestjs/common';
import { ForceCheckInCodeModule } from '../checkin/force-check-in-code.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { BachelorController } from './bachelor.controller.js';
import { BachelorImportService } from './bachelor-import.service.js';
import { BachelorService } from './bachelor.service.js';

@Module({
  imports: [RealtimeModule, ForceCheckInCodeModule],
  controllers: [BachelorController],
  providers: [BachelorService, BachelorImportService],
  exports: [BachelorService],
})
export class BachelorModule {}
