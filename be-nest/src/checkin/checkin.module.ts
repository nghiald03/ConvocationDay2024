import { Module } from '@nestjs/common';
import { BachelorModule } from '../bachelor/bachelor.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { CheckInController } from './checkin.controller.js';
import { CheckInService } from './checkin.service.js';
import { ForceCheckInCodeService } from './force-check-in-code.service.js';

@Module({
  imports: [BachelorModule, RealtimeModule],
  controllers: [CheckInController],
  providers: [CheckInService, ForceCheckInCodeService],
})
export class CheckInModule {}
