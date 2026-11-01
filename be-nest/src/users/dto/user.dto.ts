import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const normalizeRoles = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? [...new Set(value.filter((role): role is string => typeof role === 'string').map((role) => role.trim().toUpperCase()))]
    : value;

export class CreateUserDto {
  @ApiProperty({ example: 'checkin01@convocation.local' })
  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @ApiProperty({ example: 'Nhân viên check-in 01' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Transform(trim)
  name!: string;

  @ApiProperty({ minLength: 12, maxLength: 128 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: ['CK'] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Transform(normalizeRoles)
  roles!: string[];
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Nhân viên check-in 01' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Transform(trim)
  name?: string;

  @ApiPropertyOptional({ example: ['CK', 'NO'] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Transform(normalizeRoles)
  roles?: string[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  disabled?: boolean;
}

export class SetUserPasswordDto {
  @ApiProperty({ minLength: 12, maxLength: 128 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}
