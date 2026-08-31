import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { sql } from 'drizzle-orm';
import { DATABASE } from '../database/database.constants.js';
import type { AppDatabase } from '../database/database.types.js';
import { Public } from '../common/guards/public.decorator.js';
import { ObjectStorageService } from '../media/object-storage.service.js';

@ApiExcludeController()
@Controller('health')
export class HealthController {
  constructor(
    @Inject(DATABASE) private readonly database: AppDatabase,
    private readonly storage: ObjectStorageService,
  ) {}

  @Get('live')
  @Public()
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  @Public()
  async ready(): Promise<{ status: 'ready'; dependencies: { postgres: 'ok'; minio: 'ok' } }> {
    try {
      await Promise.all([this.database.execute(sql`select 1`), this.storage.ready()]);
      return { status: 'ready', dependencies: { postgres: 'ok', minio: 'ok' } };
    } catch {
      throw new ServiceUnavailableException({
        code: 'health/not-ready',
        message: 'PostgreSQL hoặc MinIO chưa sẵn sàng.',
      });
    }
  }
}
