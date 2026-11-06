import { BadRequestException, Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
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

class LedStartBody extends LedWindowQuery {
  /** true: quay về người đầu tiên dù LED đã bắt đầu. */
  @IsOptional()
  @IsBoolean()
  restart?: boolean;
}

class LedJumpBody extends LedWindowQuery {
  /** MSSV của người cần nhảy tới. */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  studentCode?: string;

  /** true: nhảy về người đầu tiên của hàng đợi. */
  @IsOptional()
  @IsBoolean()
  toFirst?: boolean;
}

type LedWindowResult =
  | Awaited<ReturnType<LedService['first']>>
  | Awaited<ReturnType<LedService['current']>>;

@ApiTags('led')
@Controller('Mc')
@RequireRoles('MN', 'MC', 'CK', 'CL')
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

  @Get('GetQueue')
  async queue(@Query() query: LedWindowQuery) {
    return {
      status: 200,
      message: 'Lấy hàng đợi LED thành công.',
      data: await this.led.queue(query.hall, query.session),
    };
  }

  /** Manager bắt đầu chiếu: đặt người đang chiếu vào người đầu hàng đợi. Từ chối nếu LED đã bắt đầu, trừ khi `restart`. */
  @Post('Start')
  @HttpCode(200)
  @RequireRoles('MN')
  async start(@Body() body: LedStartBody) {
    const result = await this.led.start(body.hall, body.session, body.restart === true);
    if (!result) {
      throw new ApiError(400, 'led/empty-queue', 'Chưa có ai check-in trong hàng đợi này nên chưa thể bắt đầu.');
    }
    return this.windowResponse(result, 'Đã bắt đầu chiếu từ tân cử nhân đầu tiên.');
  }

  /**
   * MC nhảy tới một người trong hàng đợi: về đầu (`toFirst`) hoặc theo `studentCode`. Chỉ khi LED đã bắt đầu;
   * bắt đầu lần đầu là việc của Manager (`Start`).
   */
  @Post('Jump')
  @HttpCode(200)
  @RequireRoles('MN', 'MC')
  async jump(@Body() body: LedJumpBody) {
    const code = body.studentCode?.trim();
    if (body.toFirst === true && code) {
      throw new BadRequestException('Chỉ chọn một: về đầu hoặc theo MSSV.');
    }
    if (body.toFirst !== true && !code) {
      throw new BadRequestException('Thiếu MSSV hoặc yêu cầu về đầu.');
    }
    const result = await this.led.jump(body.hall, body.session, code ? { studentCode: code } : 'first');
    return this.windowResponse(
      result,
      code ? `Đã chuyển tới ${code}.` : 'Đã về tân cử nhân đầu tiên.',
    );
  }

  /** Về người đầu tiên (luôn bắt đầu lại). Chỉ Manager, vì MC không được tự bắt đầu. */
  @Get('GetBachelor1st')
  @RequireRoles('MN')
  async first(@Query() query: LedWindowQuery) {
    return this.windowResponse(
      await this.led.start(query.hall, query.session, true),
      'Đã chọn tân cử nhân đầu tiên.',
    );
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

  private windowResponse(result: LedWindowResult, message: string) {
    if (!result) throw new ApiError(404, 'bachelor/not-found', 'Không có tân cử nhân đang hoạt động.');
    if ('notStarted' in result) {
      return {
        status: 200,
        message: 'LED chưa bắt đầu. Manager bắt đầu ở trang Hàng đợi LED.',
        data: '',
      };
    }
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
