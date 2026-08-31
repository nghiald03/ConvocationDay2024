import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sessionNum!: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  sessionInDay?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiPropertyOptional({ example: 'Phiên buổi sáng', maxLength: 500 })
  description?: string;
}

export class UpdateSessionDto extends CreateSessionDto {}

export class AutoFillSessionInDayDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  fromSession!: number;

  @Type(() => Number)
  @IsInt()
  @ApiProperty({ example: 6 })
  toSession!: number;
}
