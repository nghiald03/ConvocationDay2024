import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Permission } from '../auth/permissions.js';
import type { ActorContext } from '../common/guards/actor-context.js';
import { CurrentActor } from '../common/guards/current-actor.decorator.js';
import { RequirePermissions } from '../common/guards/require-permissions.decorator.js';
import { DeleteMediaDto, RenameMediaDto } from './dto/media.dto.js';
import { MediaService } from './media.service.js';
import {
  MAX_BULK_FILES,
  MAX_IMAGE_BYTES,
  MAX_REQUEST_BYTES,
} from './media-validator.service.js';

const multipartLimits = { fileSize: MAX_IMAGE_BYTES, files: MAX_BULK_FILES, fields: 10 };

@ApiTags('media')
@Controller('media')
@RequirePermissions(Permission.ManageMedia)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('images')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: { type: 'string', format: 'binary' },
        ownerType: { type: 'string', enum: ['bachelor', 'notification', 'export', 'temp'], example: 'temp' },
        ownerId: { type: 'string', example: 'TEST260001' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('image', { limits: multipartLimits }))
  async upload(
    @UploadedFile(new ParseFilePipe({ fileIsRequired: true })) file: Express.Multer.File,
    @Body('ownerType') ownerType: string | undefined,
    @Body('ownerId') ownerId: string | undefined,
    @CurrentActor() actor: ActorContext,
  ) {
    const asset = await this.media.upload(
      file,
      ownerType ?? 'temp',
      ownerId ?? actor.userId,
      actor.userId,
    );
    return this.media.toDto(asset);
  }

  @Post('images/bulk')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['images'],
      properties: {
        images: { type: 'array', maxItems: MAX_BULK_FILES, items: { type: 'string', format: 'binary' } },
        ownerType: { type: 'string', enum: ['bachelor', 'notification', 'export', 'temp'], example: 'temp' },
        ownerId: { type: 'string', example: 'TEST260001' },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('images', MAX_BULK_FILES, { limits: multipartLimits }))
  async uploadMany(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('ownerType') ownerType: string | undefined,
    @Body('ownerId') ownerId: string | undefined,
    @CurrentActor() actor: ActorContext,
  ) {
    if (!files.length) {
      throw new BadRequestException({ code: 'media/no-files', message: 'Chưa chọn tệp để tải lên.' });
    }
    if (files.reduce((total, file) => total + file.size, 0) > MAX_REQUEST_BYTES) {
      throw new BadRequestException({
        code: 'media/request-too-large',
        message: 'Tổng dung lượng tải lên không được vượt quá 25 MB.',
      });
    }
    const uploaded = await this.media.uploadMany(
      files,
      ownerType ?? 'temp',
      ownerId ?? actor.userId,
      actor.userId,
    );
    return uploaded.map((asset) => this.media.toDto(asset));
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const asset = await this.media.get(id);
    if (!asset) this.notFound();
    return this.media.toDto(asset ?? this.notFound());
  }

  @Get()
  async list() {
    return (await this.media.list()).map((asset) => this.media.toDto(asset));
  }

  @Get(':id/download')
  async download(@Param('id', ParseUUIDPipe) id: string) {
    const url = await this.media.downloadUrl(id);
    if (!url) this.notFound();
    return { url, expiresInSeconds: 300 };
  }

  @Get(':id/content')
  async content(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ): Promise<void> {
    const url = await this.media.downloadUrl(id);
    if (!url) this.notFound();
    response.redirect(HttpStatus.FOUND, url ?? this.notFound());
  }

  @Patch(':id')
  async rename(@Param('id', ParseUUIDPipe) id: string, @Body() input: RenameMediaDto) {
    const asset = await this.media.rename(id, input.originalName);
    if (!asset) this.notFound();
    return this.media.toDto(asset ?? this.notFound());
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    if (!(await this.media.softDelete(id))) this.notFound();
  }

  @Delete()
  async deleteMany(@Body() input: DeleteMediaDto) {
    const deleted: string[] = [];
    for (const id of [...new Set(input.ids)].slice(0, 100)) {
      if (await this.media.softDelete(id)) deleted.push(id);
    }
    return { deleted };
  }

  private notFound(): never {
    throw new NotFoundException({
      code: 'media/not-found',
      message: 'Không tìm thấy tệp media.',
    });
  }
}
