import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
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
import { BachelorService } from '../bachelor/bachelor.service.js';
import type { ActorContext } from '../common/guards/actor-context.js';
import { CurrentActor } from '../common/guards/current-actor.decorator.js';
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

function checkInResponse({ bachelor, late }: Awaited<ReturnType<CheckInService['checkInBachelor']>>) {
  return {
    status: 200,
    message: late ? 'Phiên đã khóa: đã check-in và xếp xuống cuối phiên.' : 'Check-in thành công!',
    data: {
      studentCode: bachelor.studentCode,
      fullName: bachelor.fullName,
      chair: bachelor.chair,
      chairParent: bachelor.chairParent,
      late,
    },
  };
}

@ApiTags('check-in')
@Controller('Checkin')
export class CheckInController {
  constructor(
    private readonly checkIns: CheckInService,
    private readonly bachelors: BachelorService,
  ) {}

  @Get('rooms')
  @RequirePermissions(Permission.CheckIn)
  async rooms(@CurrentActor() actor: ActorContext) {
    const [rooms, scope] = await Promise.all([
      this.bachelors.listCheckInRooms(),
      this.bachelors.checkInRoomScope(actor),
    ]);
    return {
      status: 200,
      message: 'Lấy danh sách phòng check-in thành công!',
      // assignedRooms = null: được thao tác mọi phòng.
      data: { rooms, assignedRooms: scope.unrestricted ? null : scope.rooms },
    };
  }

  @Put('UpdateCheckin')
  @RequirePermissions(Permission.CheckIn)
  async checkIn(@Body() input: CheckInBachelorDto, @CurrentActor() actor: ActorContext) {
    return checkInResponse(
      await this.checkIns.checkInBachelor(
        input.studentCode,
        input.status,
        await this.bachelors.checkInRoomScope(actor),
        input.cancellationConfirmation,
      ),
    );
  }

  @Put('UpdateCheckinStudentCode')
  @RequirePermissions(Permission.CheckIn)
  async checkInByStudentCode(
    @Query('studentCode') studentCode: string,
    @CurrentActor() actor: ActorContext,
  ) {
    return checkInResponse(
      await this.checkIns.checkInBachelor(
        studentCode,
        true,
        await this.bachelors.checkInRoomScope(actor),
      ),
    );
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

  // Tác động mọi phòng nên không thể cho tài khoản CK vốn bị giới hạn theo phòng.
  @Put('UncheckAll')
  @RequirePermissions(Permission.ManageBachelors)
  async uncheckAll(@Headers('x-confirm-destructive') confirmation: string | undefined) {
    const expected = 'UNCHECK ALL BACHELORS';
    if (confirmation !== expected) {
      throw new BadRequestException({
        code: 'checkin/destructive-confirmation-required',
        message: `Hủy toàn bộ check-in yêu cầu header X-Confirm-Destructive: ${expected}.`,
      });
    }
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
  @RequireRoles('CK', 'CL', 'MN')
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
  @RequireRoles('MN', 'CK', 'CL')
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
