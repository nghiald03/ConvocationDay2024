import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { MediaModule } from '../media/media.module.js';

@Module({ imports: [MediaModule], controllers: [HealthController] })
export class HealthModule {}
