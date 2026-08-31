import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class NotificationDto {
  @ApiProperty({ example: 'Mời tân cử nhân chuẩn bị' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  @ApiProperty({ example: 'Các tân cử nhân phiên 1 vui lòng di chuyển vào hội trường.' })
  content!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  @ApiProperty({ example: 2, minimum: 1, maximum: 3, default: 2 })
  priority = 2;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({ example: 1 })
  hallId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({ example: 1 })
  sessionId?: number;

  @Type(() => Date)
  @IsOptional()
  @IsDate()
  @ApiPropertyOptional({ example: '2026-08-31T08:00:00.000Z', type: String, format: 'date-time' })
  scheduledAt?: Date;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: false, default: false })
  isAutomatic = false;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @ApiPropertyOptional({ example: 1, minimum: 1, maximum: 10, default: 1 })
  repeatCount = 1;
}
