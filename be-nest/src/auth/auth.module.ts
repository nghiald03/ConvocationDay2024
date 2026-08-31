import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule as BetterAuthNestModule } from '@thallesp/nestjs-better-auth';
import { DATABASE } from '../database/database.constants.js';
import type { AppDatabase } from '../database/database.types.js';
import { createAuth } from './auth.factory.js';
import { AuthCompatibilityService } from './auth-compatibility.service.js';
import { AuthController } from './auth.controller.js';
import { AuthSessionService } from './auth-session.service.js';

@Module({
  imports: [
    BetterAuthNestModule.forRootAsync({
      inject: [DATABASE, ConfigService],
      useFactory: (database: AppDatabase, config: ConfigService) => ({
        auth: createAuth(database, config),
        bodyParser: {
          json: { limit: '12mb' },
          urlencoded: { limit: '2mb', extended: true },
          rawBody: false,
        },
      }),
      disableGlobalAuthGuard: true,
      disableControllers: false,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthCompatibilityService, AuthSessionService],
  exports: [AuthSessionService],
})
export class AuthModule {}
