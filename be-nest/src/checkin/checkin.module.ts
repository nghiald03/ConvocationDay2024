import { Module } from '@nestjs/common';
import { BachelorModule } from '../bachelor/bachelor.module.js';
import { CheckInController } from './checkin.controller.js';
import { CheckInService } from './checkin.service.js';

@Module({ imports: [BachelorModule], controllers: [CheckInController], providers: [CheckInService] })
export class CheckInModule {}
