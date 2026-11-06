import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({ imports: [RealtimeModule], controllers: [UsersController], providers: [UsersService] })
export class UsersModule {}
