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
    if (!data.length) throw new NotFoundException('Không tìm thấy side đang mở check-in.');
    return { status: 200, message: 'Lấy side đang hoạt động thành công!', data };
  }

  @Get('checkin-room-summary')
  async checkinRoomSummary() {
    return {
      status: 200,
      message: 'Lấy thống kê check-in theo phòng thành công!',
      data: await this.statistics.checkinRoomSummary(),
    };
  }

  @Get('hall-overview')
  async hallOverview() {
    const data = await this.statistics.hallOverview();
    if (!data.length) throw new NotFoundException('Không tìm thấy dữ liệu side.');
    return { status: 200, message: 'Lấy tổng quan side thành công!', data };
  }
}
