import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'manager.test@convocation.local' })
  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  userName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  @ApiProperty({ example: '<mật khẩu từ TEST_ACCOUNT_PASSWORD>', minLength: 1, maxLength: 128 })
  password!: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ example: true, required: false })
  rememberMe?: boolean;
}

export class ChangePasswordDto {
  @ApiProperty({ example: '<mật khẩu hiện tại>' })
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @ApiProperty({ example: 'MatKhauMoi!2026', minLength: 12, maxLength: 128 })
  newPassword!: string;
}

export class RequestPasswordResetDto {
  @ApiProperty({ example: 'manager.test@convocation.local' })
  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;
}

export class ConfirmPasswordResetDto extends RequestPasswordResetDto {
  @ApiProperty({ example: 'reset-token-from-email' })
  @IsString()
  token!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @ApiProperty({ example: 'MatKhauMoi!2026', minLength: 12, maxLength: 128 })
  newPassword!: string;
}
