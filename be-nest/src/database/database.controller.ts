import { BadRequestException, Controller, Headers, Inject, NotFoundException, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Pool } from 'pg';
import { Permission } from '../auth/permissions.js';
import { RequirePermissions } from '../common/guards/require-permissions.decorator.js';
import { DATABASE_POOL } from './database.constants.js';

@Controller('Database')
export class DatabaseController {
  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly config: ConfigService,
  ) {}

  @Post('reset-database')
  @RequirePermissions(Permission.ManageSystem)
  async reset(@Headers('x-confirm-destructive') confirmation: string | undefined) {
    if (!this.config.getOrThrow<boolean>('ALLOW_DATABASE_RESET')) {
      throw new NotFoundException({
        code: 'operation/not-available',
        message: 'Chức năng đặt lại cơ sở dữ liệu không được bật.',
      });
    }
    const result = await this.pool.query<{ name: string }>('select current_database() as name');
    const name = result.rows[0]?.name;
    if (!name || !/^[A-Za-z0-9_]+$/.test(name)) {
      throw new BadRequestException({
        code: 'database/invalid-name',
        message: 'Tên cơ sở dữ liệu không hợp lệ.',
      });
    }
    const expected = `RESET ${name}`;
    if (confirmation !== expected) {
      throw new BadRequestException({
        code: 'operation/confirmation-required',
        message: 'Thiếu xác nhận cho thao tác đặt lại cơ sở dữ liệu.',
        details: { expected },
      });
    }
    await this.pool.query(`
      truncate table
        legacy_media_mapping,
        media_asset,
        notification,
        bachelor,
        check_in,
        session,
        hall,
        audit_event
      restart identity cascade
    `);
    return { message: 'Đặt lại dữ liệu nghiệp vụ thành công.' };
  }
}
