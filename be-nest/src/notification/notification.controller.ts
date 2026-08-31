import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Permission } from '../auth/permissions.js';
import type { ActorContext } from '../common/guards/actor-context.js';
import { CurrentActor } from '../common/guards/current-actor.decorator.js';
import { RequirePermissions } from '../common/guards/require-permissions.decorator.js';
import { RequireRoles } from '../common/guards/require-roles.decorator.js';
import { NotificationDto } from './dto/notification.dto.js';
import { NotificationService } from './notification.service.js';

class NotificationListQuery {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageIndex = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize = 10;

  @IsOptional()
  @IsString()
  status?: string;
}

class PendingNotificationQuery {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  hallId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  sessionId?: number;
}

@ApiTags('notification')
@Controller('Notification')
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  list(@Query() query: NotificationListQuery) {
    return this.notifications.list(query.pageIndex, query.pageSize, query.status);
  }

  @Get('pending')
  @RequireRoles('NO')
  pending(@Query() query: PendingNotificationQuery) {
    return this.notifications.pending(query.hallId, query.sessionId);
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    const notification = await this.notifications.get(id);
    if (!notification) {
      throw new NotFoundException({
        code: 'notification/not-found',
        message: 'Không tìm thấy thông báo.',
      });
    }
    return notification;
  }

  @Post()
  @RequirePermissions(Permission.ManageNotifications)
  async create(@Body() input: NotificationDto, @CurrentActor() actor: ActorContext) {
    const created = await this.notifications.create(input, actor.userId);
    return { message: 'Tạo thông báo thành công.', notificationId: created.id };
  }

  @Put(':id')
  @RequirePermissions(Permission.ManageNotifications)
  async update(@Param('id', ParseIntPipe) id: number, @Body() input: NotificationDto) {
    if (!(await this.notifications.update(id, input))) {
      throw new NotFoundException({
        code: 'notification/not-found',
        message: 'Không tìm thấy thông báo.',
      });
    }
    return { message: 'Cập nhật thông báo thành công.' };
  }

  @Delete(':id')
  @RequirePermissions(Permission.ManageNotifications)
  async delete(@Param('id', ParseIntPipe) id: number) {
    if (!(await this.notifications.delete(id))) {
      throw new NotFoundException({
        code: 'notification/not-found',
        message: 'Không tìm thấy thông báo.',
      });
    }
    return { message: 'Xóa thông báo thành công.' };
  }

  @Post(':id/start-broadcast')
  @RequirePermissions(Permission.BroadcastNotifications)
  async startBroadcast(
    @Param('id', ParseIntPipe) id: number,
    @CurrentActor() actor: ActorContext,
  ) {
    if (!(await this.notifications.transition(id, ['PENDING'], 'BROADCASTING', actor.userId))) {
      throw new BadRequestException({
        code: 'notification/invalid-transition',
        message: 'Không thể bắt đầu phát: thông báo không tồn tại hoặc không ở trạng thái chờ.',
      });
    }
    return { message: 'Bắt đầu phát thông báo thành công.' };
  }

  @Post(':id/complete')
  @RequirePermissions(Permission.BroadcastNotifications)
  async complete(@Param('id', ParseIntPipe) id: number) {
    if (!(await this.notifications.transition(id, ['BROADCASTING'], 'COMPLETED'))) {
      throw new BadRequestException({
        code: 'notification/invalid-transition',
        message: 'Không thể hoàn tất: thông báo không tồn tại hoặc chưa được phát.',
      });
    }
    return { message: 'Hoàn tất phát thông báo thành công.' };
  }

  @Post(':id/cancel')
  @RequirePermissions(Permission.ManageNotifications)
  async cancel(@Param('id', ParseIntPipe) id: number) {
    if (!(await this.notifications.transition(id, ['PENDING', 'BROADCASTING'], 'CANCELLED'))) {
      throw new BadRequestException({
        code: 'notification/invalid-transition',
        message: 'Không thể hủy: thông báo không tồn tại hoặc đã hoàn tất.',
      });
    }
    return { message: 'Hủy thông báo thành công.' };
  }

  @Post(':id/broadcast')
  @RequirePermissions(Permission.BroadcastNotifications)
  async broadcast(@Param('id', ParseIntPipe) id: number) {
    const data = await this.notifications.broadcast(id);
    if (!data) {
      throw new NotFoundException({
        code: 'notification/not-found',
        message: 'Không tìm thấy thông báo.',
      });
    }
    return { message: 'Phát thông báo đến người đọc thành công.', data };
  }
}
