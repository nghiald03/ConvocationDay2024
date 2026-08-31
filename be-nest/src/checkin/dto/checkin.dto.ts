import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckInBachelorDto {
  @ApiProperty({ example: 'TEST260001' })
  @IsString()
  @MinLength(1)
  studentCode!: string;

  @IsBoolean()
  @ApiProperty({ example: true })
  status!: boolean;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'TEST260001', required: false })
  cancellationConfirmation?: string;
}

export class UpdateCheckInStatusDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  checkinId!: number;

  @IsBoolean()
  @ApiProperty({ example: true })
  status!: boolean;
}

export class CreateCheckInDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  hallId!: number;

  @Type(() => Number)
  @IsInt()
  @ApiProperty({ example: 1 })
  sessionId!: number;
}
