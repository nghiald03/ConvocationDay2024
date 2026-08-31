import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permission } from '../auth/permissions.js';
import { Public } from '../common/guards/public.decorator.js';
import { RequirePermissions } from '../common/guards/require-permissions.decorator.js';
import {
  AutoFillSessionInDayDto,
  CreateSessionDto,
  UpdateSessionDto,
} from './dto/session.dto.js';
import { SessionService } from './session.service.js';

@ApiTags('session')
@Controller('Session')
export class SessionController {
  constructor(private readonly sessions: SessionService) {}

  @Post('CreateSession')
  @RequirePermissions(Permission.ManageSessions)
  async create(@Body() input: CreateSessionDto) {
    return {
      status: 200,
      message: 'Tạo phiên check-in thành công!',
      data: await this.sessions.create(input.sessionNum, input.sessionInDay, input.description),
    };
  }

  @Get('GetAll')
  @Public()
  async list() {
    const data = await this.sessions.list();
    return data.length
      ? { status: 200, message: 'Lấy danh sách phiên thành công!', data }
      : { status: 204, message: 'Không có phiên nào!' };
  }

  @Put('UpdateStatusSession/:sessionId')
  @RequirePermissions(Permission.ManageSessions)
  async update(
    @Param('sessionId', ParseIntPipe) id: number,
    @Body() input: UpdateSessionDto,
  ) {
    return {
      status: 200,
      message: 'Cập nhật phiên thành công!',
      data: await this.sessions.update(id, input.sessionNum, input.sessionInDay, input.description),
    };
  }

  @Delete('DeleteSession/:sessionId')
  @RequirePermissions(Permission.ManageSessions)
  async delete(@Param('sessionId', ParseIntPipe) id: number) {
    return {
      status: 200,
      message: 'Xóa phiên thành công!',
      data: await this.sessions.delete(id),
    };
  }

  @Post('AutoFillSessionInDay')
  @RequirePermissions(Permission.ManageSessions)
  async autoFill(@Body() input: AutoFillSessionInDayDto) {
    if (input.fromSession > input.toSession) {
      throw new BadRequestException('Phiên bắt đầu phải nhỏ hơn hoặc bằng phiên kết thúc!');
    }
    const success = await this.sessions.autoFill(input.fromSession, input.toSession);
    if (!success) {
      throw new BadRequestException(
        'Không tìm thấy phiên trong khoảng đã chọn hoặc không thể tự động điền!',
      );
    }
    return {
      status: 200,
      message: `Tự động điền buổi trong ngày cho các phiên từ ${input.fromSession} đến ${input.toSession} thành công!`,
      data: { fromSession: input.fromSession, toSession: input.toSession },
    };
  }
}
