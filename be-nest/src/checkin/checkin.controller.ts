import {
  BadRequestException,
  Body,
  Controller,
  Get,
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
import { Public } from '../common/guards/public.decorator.js';
import { RequirePermissions } from '../common/guards/require-permissions.decorator.js';
import { RequireRoles } from '../common/guards/require-roles.decorator.js';
import { CheckInService } from './checkin.service.js';
import {
  CheckInBachelorDto,
  CreateCheckInDto,
  UpdateCheckInStatusDto,
} from './dto/checkin.dto.js';

class CheckInListQuery {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageIndex = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize = 10;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  hallId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  sessionId?: number;

  @IsOptional()
  @IsString()
  keySearch?: string;
}

@ApiTags('check-in')
@Controller('Checkin')
export class CheckInController {
  constructor(private readonly checkIns: CheckInService) {}

  @Put('UpdateCheckin')
  @RequirePermissions(Permission.CheckIn)
  checkIn(@Body() input: CheckInBachelorDto) {
    return this.checkIns.checkInBachelor(input.studentCode, input.status);
  }

  @Put('UpdateCheckinStudentCode')
  @RequirePermissions(Permission.CheckIn)
  checkInByStudentCode(@Query('studentCode') studentCode: string) {
    return this.checkIns.checkInBachelor(studentCode, true);
  }

  @Get('GetAll')
  @RequirePermissions(Permission.CheckIn)
  async list() {
    return {
      status: 200,
      message: 'Lấy danh sách check-in thành công!',
      data: await this.checkIns.listRaw(),
    };
  }

  @Put('UncheckAll')
  @RequirePermissions(Permission.CheckIn)
  async uncheckAll() {
    await this.checkIns.uncheckAll();
    return { status: 200, message: 'Hủy check-in của toàn bộ tân cử nhân thành công!' };
  }

  @Get('GetAllStatusCheckin')
  @RequirePermissions(Permission.ManageBachelors)
  async statuses() {
    return {
      status: 200,
      message: 'Lấy toàn bộ trạng thái check-in thành công!',
      data: await this.checkIns.listStatuses(),
    };
  }

  @Put('UpdateStatusCheckin')
  @RequirePermissions(Permission.ManageBachelors)
  async updateStatus(@Body() input: UpdateCheckInStatusDto) {
    return {
      status: 200,
      message: 'Cập nhật trạng thái check-in thành công!',
      data: await this.checkIns.updateStatus(input.checkinId, input.status),
    };
  }

  @Get('GetCountCheckin')
  @RequireRoles('CK', 'MN')
  async counts() {
    return {
      status: 200,
      message: 'Lấy thống kê check-in thành công!',
      data: await this.checkIns.counts(),
    };
  }

  @Post('CreateCheckin')
  @RequirePermissions(Permission.CheckIn)
  async create(@Body() input: CreateCheckInDto) {
    if (!(await this.checkIns.create(input.hallId, input.sessionId))) {
      throw new BadRequestException({
        code: 'checkin/already-exists',
        message: 'Bản ghi check-in đã tồn tại!',
      });
    }
    return { status: 200, message: 'Tạo bản ghi check-in thành công!' };
  }

  @Get('GetListBachelorNotCheckin')
  @Public()
  async notCheckedIn() {
    return {
      status: 200,
      message: 'Lấy danh sách tân cử nhân chưa check-in thành công!',
      data: await this.checkIns.bachelorsNotCheckedIn(),
    };
  }

  @Get('GetListBachelorNotCheckinV2')
  @Public()
  async notCheckedInPaginated(@Query() query: CheckInListQuery) {
    const data = await this.checkIns.bachelorsNotCheckedIn(query.pageIndex, query.pageSize);
    return {
      status: 'totalItems' in data && data.totalItems === 0 ? 204 : 200,
      message:
        'totalItems' in data && data.totalItems === 0
          ? 'Không có tân cử nhân nào chưa check-in!'
          : 'Lấy danh sách tân cử nhân chưa check-in thành công!',
      ...('totalItems' in data && data.totalItems > 0 ? { data } : {}),
    };
  }

  @Get('GetCheckinStatusFalse')
  @Public()
  async closedStatuses() {
    return {
      status: 200,
      message: 'Lấy danh sách phiên check-in đã đóng thành công!',
      data: await this.checkIns.listStatuses(false),
    };
  }

  @Get('GetStudentsNotCheckedInOpenSessions')
  @RequireRoles('MN', 'CK')
  async notCheckedInOpen(@Query() query: CheckInListQuery) {
    const data = await this.checkIns.studentsNotCheckedInOpenSessions(query);
    return {
      status: 200,
      message: data.totalItems
        ? 'Lấy danh sách tân cử nhân chưa check-in trong phiên đang mở thành công!'
        : 'Không có tân cử nhân chưa check-in trong các phiên đang mở!',
      data,
    };
  }

  @Get('by-hall/:hallId')
  @Public()
  byHall(@Param('hallId', ParseIntPipe) hallId: number) {
    return this.checkIns.byHallId(hallId);
  }

  @Get('by-hall-name')
  @Public()
  byHallName(@Query('hallName') hallName: string) {
    return this.checkIns.byHallName(hallName);
  }
}
