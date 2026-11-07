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

  /** Bắt buộc với nhân viên check-in khi phiên đã khóa (check-in trễ). */
  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'AB23', required: false, description: 'Mã khẩn cấp, cần khi check-in trễ' })
  emergencyCode?: string;
}

export class ForceCheckInDto {
  @ApiProperty({ example: 'TEST260001' })
  @IsString()
  @MinLength(1)
  studentCode!: string;

  @ApiProperty({ example: '0000', description: 'Mã khẩn cấp do ban tổ chức cấp' })
  @IsString()
  @MinLength(1)
  emergencyCode!: string;
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
