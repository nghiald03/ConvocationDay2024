import { Body, Controller, Get, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permission } from '../auth/permissions.js';
import { CurrentActor } from '../common/guards/current-actor.decorator.js';
import type { ActorContext } from '../common/guards/actor-context.js';
import { Public } from '../common/guards/public.decorator.js';
import { RequirePermissions } from '../common/guards/require-permissions.decorator.js';
import {
  PhotoQueueAuditQuery,
  PhotoQueueSessionQuery,
  CreatePhotoQueueSessionDto,
  ConfirmPhotoQueueCurrentDto,
  CoordinatorIssueNumberDto,
  RequestPhotoQueueNumberDto,
  SetPhotoQueueNumberDto,
  UploadPhotoQueueAssignmentDto,
} from './dto/photo-queue.dto.js';
import { PhotoQueueService } from './photo-queue.service.js';

@ApiTags('photo-queue')
@Controller('PhotoQueue')
export class PhotoQueueController {
  constructor(private readonly photoQueue: PhotoQueueService) {}

  @Post('RequestNumber')
  @RequirePermissions(Permission.RequestPhotoQueue)
  async requestNumber(@Body() input: RequestPhotoQueueNumberDto) {
    return {
      status: 200,
      message: 'Lấy số thứ tự chụp ảnh thành công.',
      data: await this.photoQueue.requestNumber(input.studentCode),
    };
  }

  @Post('KioskLookup')
  @RequirePermissions(Permission.RequestPhotoQueue)
  async kioskLookup(@Body() input: RequestPhotoQueueNumberDto) {
    return {
      status: 200,
      message: 'Tra cứu thông tin tân cử nhân thành công.',
      data: await this.photoQueue.kioskLookup(input.studentCode),
    };
  }

  @Get('LookupBachelor')
  @RequirePermissions(Permission.ControlPhotoQueue)
  async lookupBachelor(@Query('studentCode') studentCode: string) {
    return {
      status: 200,
      message: 'Lấy thông tin tân cử nhân thành công.',
      data: await this.photoQueue.lookupBachelor(studentCode),
    };
  }

  @Post('CoordinatorIssueNumber')
  @RequirePermissions(Permission.ControlPhotoQueue)
  async coordinatorIssueNumber(
    @Body() input: CoordinatorIssueNumberDto,
    @CurrentActor() actor: ActorContext,
  ) {
    return {
      status: 200,
      message: 'Điều phối cấp số chụp ảnh thành công.',
      data: await this.photoQueue.coordinatorIssueNumber(
        input.studentCode,
        input.photoSessionId,
        input.reason,
        actor,
      ),
    };
  }

  @Post('Assignments')
  @RequirePermissions(Permission.ControlPhotoQueue)
  async uploadAssignments(@Body() input: UploadPhotoQueueAssignmentDto[]) {
    return {
      status: 200,
      message: 'Upload danh sách tân cử nhân theo phiên chụp thành công.',
      data: await this.photoQueue.uploadAssignments(input),
    };
  }

  @Get('Sessions')
  @RequirePermissions(Permission.ControlPhotoQueue)
  async sessions() {
    return {
      status: 200,
      message: 'Lấy danh sách phiên chụp ảnh thành công.',
      data: await this.photoQueue.sessions(),
    };
  }

  @Post('Sessions')
  @RequirePermissions(Permission.ControlPhotoQueue)
  async createSession(@Body() input: CreatePhotoQueueSessionDto) {
    return {
      status: 200,
      message: 'Tạo phiên chụp ảnh thành công.',
      data: await this.photoQueue.createSession(input.name, input.description),
    };
  }

  @Put('Sessions/ActivateKiosk')
  @RequirePermissions(Permission.ControlPhotoQueue)
  async activateKioskSession(@Query() query: PhotoQueueSessionQuery) {
    return {
      status: 200,
      message: 'Đã chọn phiên chụp ảnh cho kiosk.',
      data: await this.photoQueue.activateKioskSession(query.photoSessionId!),
    };
  }

  @Get('ActiveSession')
  @RequirePermissions(Permission.RequestPhotoQueue)
  async activeSession() {
    return {
      status: 200,
      message: 'Lấy phiên chụp ảnh đang hoạt động thành công.',
      data: await this.photoQueue.activeSession(),
    };
  }

  @Get('PublicState')
  @Public()
  async publicState(@Query() query: PhotoQueueSessionQuery) {
    return {
      status: 200,
      message: 'Lấy số thứ tự đang chụp thành công.',
      data: await this.photoQueue.publicState(query.photoSessionId),
    };
  }

  @Put('Next')
  @RequirePermissions(Permission.ControlPhotoQueue)
  next(@Query() query: PhotoQueueSessionQuery, @CurrentActor() actor: ActorContext) {
    return this.photoQueue.next(query.photoSessionId!, actor);
  }

  @Put('ConfirmCurrent')
  @RequirePermissions(Permission.ControlPhotoQueue)
  confirmCurrent(
    @Query() query: PhotoQueueSessionQuery,
    @Body() input: ConfirmPhotoQueueCurrentDto,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.photoQueue.confirmCurrent(query.photoSessionId!, input, actor);
  }

  @Put('Previous')
  @RequirePermissions(Permission.ControlPhotoQueue)
  previous(@Query() query: PhotoQueueSessionQuery, @CurrentActor() actor: ActorContext) {
    return this.photoQueue.previous(query.photoSessionId!, actor);
  }

  @Put('SetNumber')
  @RequirePermissions(Permission.ControlPhotoQueue)
  setNumber(
    @Query() query: PhotoQueueSessionQuery,
    @Body() input: SetPhotoQueueNumberDto,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.photoQueue.setNumber(query.photoSessionId!, input.queueNumber, actor);
  }

  @Get('Stats')
  @RequirePermissions(Permission.ControlPhotoQueue)
  async stats(@Query() query: PhotoQueueSessionQuery) {
    return {
      status: 200,
      message: 'Lấy thống kê chụp ảnh thành công.',
      data: await this.photoQueue.stats(query.photoSessionId!),
    };
  }

  @Get('AuditLogs')
  @RequirePermissions(Permission.ControlPhotoQueue)
  async auditLogs(@Query() query: PhotoQueueAuditQuery) {
    return {
      status: 200,
      message: 'Lấy audit log chụp ảnh thành công.',
      data: await this.photoQueue.auditLogs(query.photoSessionId!, query.limit),
    };
  }
}
