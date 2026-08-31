import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ example: '/images/users/user-1.jpg' })
  @IsString()
  @MaxLength(250)
  image!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @ApiProperty({ example: 'Nguyễn Văn An' })
  fullName!: string;

  @IsString()
  @MaxLength(50)
  @ApiProperty({ example: 'Công nghệ thông tin' })
  major!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @ApiProperty({ example: 'TEST260001' })
  studentCode!: string;

  @IsEmail()
  @MaxLength(100)
  @ApiProperty({ example: 'test260001@example.edu.vn' })
  mail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @ApiPropertyOptional({ example: 'Khoa Công nghệ thông tin', nullable: true })
  faculty?: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @ApiProperty({ example: 'Hội trường A' })
  hallName!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiProperty({ example: 1, minimum: 1 })
  sessionNum!: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({ example: 1, nullable: true })
  sessionInDay?: number | null;

  @IsString()
  @MaxLength(50)
  @ApiProperty({ example: 'A1-1' })
  chair!: string;

  @IsString()
  @MaxLength(50)
  @ApiProperty({ example: 'A1-P1' })
  chairParent!: string;
}

export class MoveToTemporarySessionDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isMorning!: boolean;
}

export class TransferLateStudentDto {
  @ApiProperty({ example: 'TEST260001' })
  @IsString()
  studentCode!: string;

  @Type(() => Number)
  @IsInt()
  @ApiProperty({ example: 2 })
  newSessionId!: number;
}

export class BachelorListItemDto extends BachelorDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  id?: number;
}
