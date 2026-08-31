import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class PhotoQueueSessionQuery {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  photoSessionId?: number;
}

export class RequestPhotoQueueNumberDto {
  @IsString()
  studentCode!: string;
}

export class SetPhotoQueueNumberDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  queueNumber!: number;
}

export class ConfirmPhotoQueueCurrentDto {
  @IsBoolean()
  photographed!: boolean;

  @IsOptional()
  @IsString()
  retouchNoteImage1?: string;

  @IsOptional()
  @IsString()
  retouchNoteImage2?: string;
}

export class CoordinatorIssueNumberDto {
  @IsString()
  studentCode!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  photoSessionId!: number;

  @IsString()
  reason!: string;
}

export class UploadPhotoQueueAssignmentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  photoSessionId!: number;

  @IsString()
  studentCode!: string;

  @IsOptional()
  @IsBoolean()
  requiresCoordinator?: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}

export class PhotoQueueAuditQuery extends PhotoQueueSessionQuery {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  limit = 50;
}

export class CreatePhotoQueueSessionDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
