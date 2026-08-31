import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { LedController } from './led.controller.js';
import { LedService } from './led.service.js';

@Module({ imports: [RealtimeModule], controllers: [LedController], providers: [LedService] })
export class LedModule {}
