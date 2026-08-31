import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ApiExceptionFilter } from './common/errors/api-exception.filter.js';
import { PermissionGuard } from './common/guards/permission.guard.js';
import { SessionGuard } from './common/guards/session.guard.js';
import { RequestLoggingInterceptor } from './common/logging/request-logging.interceptor.js';
import { validateEnvironment } from './config/environment.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { HealthModule } from './health/health.module.js';
import { AuditInterceptor } from './audit/audit.interceptor.js';
import { HallModule } from './hall/hall.module.js';
import { SessionModule } from './session/session.module.js';
import { StatisticsModule } from './statistics/statistics.module.js';
import { BachelorModule } from './bachelor/bachelor.module.js';
import { CheckInModule } from './checkin/checkin.module.js';
import { NotificationModule } from './notification/notification.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { LedModule } from './led/led.module.js';
import { MediaModule } from './media/media.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnvironment }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    HallModule,
    SessionModule,
    StatisticsModule,
    BachelorModule,
    CheckInModule,
    RealtimeModule,
    NotificationModule,
    LedModule,
    MediaModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
