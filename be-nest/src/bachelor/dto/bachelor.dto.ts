import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class BachelorDto {
  @IsString()
  @MaxLength(250)
  image!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  fullName!: string;

  @IsString()
  @MaxLength(50)
  major!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  studentCode!: string;

  @IsEmail()
  @MaxLength(100)
  mail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  faculty?: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  hallName!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  sessionNum!: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  sessionInDay?: number | null;

  @IsString()
  @MaxLength(50)
  chair!: string;

  @IsString()
  @MaxLength(50)
  chairParent!: string;
}

export class MoveToTemporarySessionDto {
  @IsBoolean()
  isMorning!: boolean;
}

export class TransferLateStudentDto {
  @IsString()
  studentCode!: string;

  @Type(() => Number)
  @IsInt()
  newSessionId!: number;
}

export class BachelorListItemDto extends BachelorDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  id?: number;
}
