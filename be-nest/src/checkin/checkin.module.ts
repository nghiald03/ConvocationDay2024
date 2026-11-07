import { Module } from '@nestjs/common';
import { BachelorModule } from '../bachelor/bachelor.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { CheckInController } from './checkin.controller.js';
import { CheckInService } from './checkin.service.js';
import { ForceCheckInCodeModule } from './force-check-in-code.module.js';

@Module({
  imports: [BachelorModule, RealtimeModule, ForceCheckInCodeModule],
  controllers: [CheckInController],
  providers: [CheckInService],
})
export class CheckInModule {}
