import { Controller, Get, NotFoundException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/guards/public.decorator.js';
import { StatisticsService } from './statistics.service.js';

@ApiTags('statistics')
@Controller('Statistics')
@Public()
export class StatisticsController {
  constructor(private readonly statistics: StatisticsService) {}

  @Get('active-halls-summary')
  async activeHallSummary() {
    const data = await this.statistics.activeHallSummary();
    if (!data.length) throw new NotFoundException('Không tìm thấy hội trường đang mở check-in.');
    return { status: 200, message: 'Lấy hội trường đang hoạt động thành công!', data };
  }

  @Get('hall-overview')
  async hallOverview() {
    const data = await this.statistics.hallOverview();
    if (!data.length) throw new NotFoundException('Không tìm thấy dữ liệu hội trường.');
    return { status: 200, message: 'Lấy tổng quan hội trường thành công!', data };
  }
}
