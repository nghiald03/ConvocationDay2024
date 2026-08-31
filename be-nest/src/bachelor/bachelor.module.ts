import { Module } from '@nestjs/common';
import { BachelorController } from './bachelor.controller.js';
import { BachelorService } from './bachelor.service.js';

@Module({ controllers: [BachelorController], providers: [BachelorService], exports: [BachelorService] })
export class BachelorModule {}
