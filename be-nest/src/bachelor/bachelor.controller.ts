import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseArrayPipe,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Permission } from '../auth/permissions.js';
import { RequirePermissions } from '../common/guards/require-permissions.decorator.js';
import { RequireRoles } from '../common/guards/require-roles.decorator.js';
import { BachelorService } from './bachelor.service.js';
import {
  BachelorDto,
  BachelorListItemDto,
  MoveToTemporarySessionDto,
  TransferLateStudentDto,
} from './dto/bachelor.dto.js';

class BachelorListQuery {
  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageIndex = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ example: 20, default: 10, minimum: 1 })
  pageSize = 10;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'TEST260001' })
  keySearch?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({ example: 1 })
  sessionId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({ example: 1 })
  hallId?: number;
}

@ApiTags('bachelor')
@Controller('Bachelor')
export class BachelorController {
  constructor(private readonly bachelors: BachelorService) {}

  @Get('search')
  @RequireRoles('MN', 'CK', 'US')
  async search(@Query() query: BachelorListQuery) {
    return {
      status: 200,
      message: 'Lấy danh sách tân cử nhân thành công!',
      data: await this.bachelors.search(query.keySearch ?? '', query.pageIndex, query.pageSize),
    };
  }

  @Get('GetAll')
  @RequireRoles('MN', 'CK', 'US', 'MC')
  async list(@Query() query: BachelorListQuery) {
    const data = await this.bachelors.list(query);
    return data.totalItems
      ? { status: 200, message: 'Lấy danh sách tân cử nhân thành công!', data }
      : { status: 204, message: 'Không có tân cử nhân nào!' };
  }

  @Post('Add')
  @RequirePermissions(Permission.ManageBachelors)
  async add(
    @Body(new ParseArrayPipe({ items: BachelorDto })) input: BachelorDto[],
  ) {
    const errors = await this.bachelors.addMany(input);
    if (errors.length) {
      throw new BadRequestException({
        code: 'bachelor/import-failed',
        message: 'Có lỗi xảy ra trong quá trình thêm tân cử nhân.',
        details: { errorMessages: errors, data: input },
      });
    }
    return { status: 200, message: 'Thêm danh sách tân cử nhân thành công!', data: input };
  }

  @Put('Update')
  @RequirePermissions(Permission.ManageBachelors)
  async update(@Body() input: BachelorDto) {
    return {
      status: 200,
      message: 'Cập nhật tân cử nhân thành công!',
      data: await this.bachelors.update(input),
    };
  }

  @Put('UpdateListBachelor/:hallId/:sessionId')
  @RequirePermissions(Permission.ManageBachelors)
  async updateMany(
    @Param('hallId', ParseIntPipe) hallId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body(new ParseArrayPipe({ items: BachelorListItemDto })) input: BachelorListItemDto[],
  ) {
    return {
      status: 200,
      message: 'Cập nhật danh sách tân cử nhân thành công!',
      errorMessages: await this.bachelors.updateMany(input, hallId, sessionId),
    };
  }

  @Delete('Delete/:studentCode')
  @RequirePermissions(Permission.ManageBachelors)
  async delete(@Param('studentCode') studentCode: string) {
    if (!(await this.bachelors.delete(studentCode))) {
      throw new BadRequestException({
        code: 'bachelor/delete-failed',
        message: 'Xóa tân cử nhân thất bại!',
      });
    }
    return { status: 200, message: 'Xóa tân cử nhân thành công!' };
  }

  @Delete('DeleteAll')
  @RequirePermissions(Permission.ManageBachelors)
  async deleteAll(
    @Headers('x-confirm-destructive') confirmation: string | undefined,
  ) {
    const expected = 'DELETE ALL BACHELORS';
    if (confirmation !== expected) {
      throw new BadRequestException({
        code: 'operation/confirmation-required',
        message: 'Thiếu xác nhận cho thao tác xóa toàn bộ tân cử nhân.',
        details: { expected },
      });
    }
    return {
      status: 200,
      message: 'Xóa toàn bộ tân cử nhân thành công!',
      deletedCount: await this.bachelors.deleteAll(),
    };
  }

  @Put('ResetStatus')
  @RequirePermissions(Permission.ManageBachelors)
  async resetStatus() {
    await this.bachelors.resetStatus();
    return { status: 200, message: 'Đặt lại toàn bộ trạng thái check-in thành công!' };
  }

  @Get('GetByHallSession/:hallId/:sessionId')
  @RequireRoles('MN')
  async byHallSession(
    @Param('hallId', ParseIntPipe) hallId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    const rows = await this.bachelors.byHallSession(hallId, sessionId);
    const data = rows.map((row) => ({
      id: row.id,
      studentCode: row.studentCode,
      fullName: row.fullName,
      mail: row.mail,
      faculty: row.faculty,
      major: row.major,
      image: row.image,
      status: row.status,
      statusBaChelor: row.bachelorStatus,
      hallId: row.hallId,
      sessionId: row.sessionId,
      chair: row.chair,
      chairParent: row.chairParent,
      sessionInDay: row.sessionInDay,
      checkIn: row.checkIn,
      timeCheckIn: row.timeCheckIn,
      attendanceStatus: row.attendanceStatus,
    }));
    return { status: 200, message: 'Lấy danh sách tân cử nhân thành công!', data };
  }

  @Put('UpdateBachelorToTempSession/:studentCode')
  @RequirePermissions(Permission.CheckIn)
  async moveToTemporary(
    @Param('studentCode') studentCode: string,
    @Body() input: MoveToTemporarySessionDto,
  ) {
    const { bachelor, session, hall } = await this.bachelors.moveToTemporarySession(
      studentCode,
      input.isMorning,
    );
    return {
      status: 200,
      message: 'Đã thêm tân cử nhân vào phiên tạm thành công!',
      data: {
        studentCode: bachelor.studentCode,
        fullName: bachelor.fullName,
        hallId: hall.name,
        sessionId: session.sessionNumber,
        chair: bachelor.chair,
        chairParent: bachelor.chairParent,
        checkin: bachelor.checkIn,
        timeCheckIn: bachelor.timeCheckIn,
      },
    };
  }

  @Put('TransferLateStudent')
  @RequirePermissions(Permission.CheckIn)
  async transferLateStudent(@Body() input: TransferLateStudentDto) {
    const { bachelor, session } = await this.bachelors.transferLateStudent(
      input.studentCode,
      input.newSessionId,
    );
    return {
      status: 200,
      message: 'Chuyển phiên và đánh dấu tân cử nhân đi trễ thành công!',
      data: {
        studentCode: bachelor.studentCode,
        fullName: bachelor.fullName,
        newSessionId: session.id,
        newSession: session.sessionNumber,
        newSessionInDay: session.sessionInDay,
        attendanceStatus: 'Late',
        newChair: bachelor.chair,
        newChairParent: bachelor.chairParent,
      },
    };
  }
}
