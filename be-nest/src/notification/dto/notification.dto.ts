import { Type } from 'class-transformer';
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
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  priority = 2;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  hallId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  sessionId?: number;

  @Type(() => Date)
  @IsOptional()
  @IsDate()
  scheduledAt?: Date;

  @IsOptional()
  @IsBoolean()
  isAutomatic = false;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  repeatCount = 1;
}
