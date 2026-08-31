import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { EventsGateway } from './events.gateway.js';
import { RealtimeService } from './realtime.service.js';

@Module({
  imports: [AuthModule],
  providers: [EventsGateway, RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
