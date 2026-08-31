import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';
import { ApiError } from '../common/errors/api-error.js';
import { RequireRoles } from '../common/guards/require-roles.decorator.js';
import { LedService } from './led.service.js';

class LedWindowQuery {
  @Type(() => Number)
  @IsInt()
  hall!: number;

  @Type(() => Number)
  @IsInt()
  session!: number;
}

@ApiTags('led')
@Controller('Mc')
@RequireRoles('MN', 'MC', 'CK')
export class LedController {
  constructor(private readonly led: LedService) {}

  @Get('GetLocationBachelor')
  async location(@Query('studentCode') studentCode: string) {
    const bachelor = await this.led.location(studentCode);
    if (!bachelor) throw new ApiError(404, 'bachelor/not-found', 'Không tìm thấy tân cử nhân.');
    if (!bachelor.checkIn || !bachelor.status) {
      return { status: 200, message: 'Tân cử nhân chưa check-in hoặc chưa được kích hoạt.', data: '' };
    }
    return { status: 200, message: 'Lấy vị trí tân cử nhân thành công.', data: this.led.legacyRow(bachelor) };
  }

  @Get('GetAllLocationBachelor')
  async allLocations() {
    const rows = await this.led.allLocations();
    if (!rows.length) throw new ApiError(404, 'bachelor/not-found', 'Không có tân cử nhân nào.');
    return {
      status: 200,
      message: 'Lấy vị trí tân cử nhân thành công.',
      data: rows.map((row) => ({
        id: row.id,
        studentCode: row.studentCode,
        fullname: row.fullName,
        mail: row.mail,
        major: row.major,
        hallName: row.hallId,
        sessionNum: row.sessionId,
        chair: row.chair,
        chairParent: row.chairParent,
        message: !row.checkIn || !row.status ? 'Tân cử nhân chưa check-in hoặc chưa được kích hoạt.' : 'Sẵn sàng',
      })),
    };
  }

  @Get('GetBachelor1st')
  async first(@Query() query: LedWindowQuery) {
    return this.windowResponse(await this.led.first(query.hall, query.session), 'Đã chọn tân cử nhân đầu tiên.');
  }

  @Get('GetBachelorNext')
  async next(@Query() query: LedWindowQuery) {
    return this.windowResponse(await this.led.next(query.hall, query.session), 'Đã chuyển đến tân cử nhân tiếp theo.');
  }

  @Get('GetBachelorBack')
  async previous(@Query() query: LedWindowQuery) {
    return this.windowResponse(await this.led.previous(query.hall, query.session), 'Đã quay lại tân cử nhân trước đó.');
  }

  @Get('GetBachelorCurrent')
  async current(@Query() query: LedWindowQuery) {
    return this.windowResponse(await this.led.current(query.hall, query.session), 'Đã tải lại tân cử nhân hiện tại.');
  }

  private windowResponse(
    result: Awaited<ReturnType<LedService['current']>>,
    message: string,
  ) {
    if (!result) throw new ApiError(404, 'bachelor/not-found', 'Không có tân cử nhân đang hoạt động.');
    if ('boundary' in result) {
      return {
        status: 200,
        message:
          result.boundary === 'last'
            ? 'Đang ở tân cử nhân cuối cùng, không thể chuyển tiếp.'
            : 'Đang ở tân cử nhân đầu tiên, không thể quay lại.',
        data: '',
      };
    }
    return {
      status: 200,
      message,
      data: {
        Bachelor1: this.led.legacyRow(result.previous),
        Bachelor2: this.led.legacyRow(result.selected),
        Bachelor3: this.led.legacyRow(result.next),
        User1: this.led.legacyRow(result.selected),
        User2: this.led.legacyRow(result.next),
      },
    };
  }
}
