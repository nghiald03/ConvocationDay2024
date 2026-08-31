import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateSessionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sessionNum!: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  sessionInDay?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateSessionDto extends CreateSessionDto {}

export class AutoFillSessionInDayDto {
  @Type(() => Number)
  @IsInt()
  fromSession!: number;

  @Type(() => Number)
  @IsInt()
  toSession!: number;
}
