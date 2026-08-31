import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsString, MinLength } from 'class-validator';

export class CheckInBachelorDto {
  @IsString()
  @MinLength(1)
  studentCode!: string;

  @IsBoolean()
  status!: boolean;
}

export class UpdateCheckInStatusDto {
  @Type(() => Number)
  @IsInt()
  checkinId!: number;

  @IsBoolean()
  status!: boolean;
}

export class CreateCheckInDto {
  @Type(() => Number)
  @IsInt()
  hallId!: number;

  @Type(() => Number)
  @IsInt()
  sessionId!: number;
}
