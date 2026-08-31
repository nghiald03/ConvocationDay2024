import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permission } from '../auth/permissions.js';
import { Public } from '../common/guards/public.decorator.js';
import { RequirePermissions } from '../common/guards/require-permissions.decorator.js';
import { CreateHallDto } from './dto/hall.dto.js';
import { HallService } from './hall.service.js';

@ApiTags('hall')
@Controller('Hall')
export class HallController {
  constructor(private readonly halls: HallService) {}

  @Post('CreateHall')
  @RequirePermissions(Permission.ManageHalls)
  async create(@Body() input: CreateHallDto) {
    return {
      status: 200,
      message: 'Tạo hội trường thành công!',
      data: await this.halls.create(input.hallName),
    };
  }

  @Get('GetAll')
  @Public()
  async list() {
    const data = await this.halls.list();
    return data.length
      ? { status: 200, message: 'Lấy danh sách hội trường thành công!', data }
      : { status: 204, message: 'Không có hội trường nào!' };
  }

  @Put('UpdateHall/:hallId')
  @RequirePermissions(Permission.ManageHalls)
  async update(@Param('hallId', ParseIntPipe) id: number, @Body() name: string) {
    const success = await this.halls.update(id, name.trim());
    if (!success) return { status: 400, message: 'Cập nhật hội trường thất bại!' };
    return { status: 200, message: 'Cập nhật hội trường thành công!', data: true };
  }

  @Delete('DeleteHall/:hallId')
  @RequirePermissions(Permission.ManageHalls)
  async delete(@Param('hallId', ParseIntPipe) id: number) {
    const success = await this.halls.delete(id);
    if (!success) {
      return {
        status: 400,
        message: 'Xóa thất bại! Hãy chắc chắn hội trường không còn tân cử nhân hoặc bản ghi check-in nào.',
      };
    }
    return { status: 200, message: 'Xóa hội trường thành công!', data: true };
  }
}
