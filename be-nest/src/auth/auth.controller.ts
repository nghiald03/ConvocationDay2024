import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentActor } from '../common/guards/current-actor.decorator.js';
import type { ActorContext } from '../common/guards/actor-context.js';
import { Public } from '../common/guards/public.decorator.js';
import { AuthCompatibilityService } from './auth-compatibility.service.js';
import {
  ChangePasswordDto,
  ConfirmPasswordResetDto,
  LoginDto,
  RequestPasswordResetDto,
} from './dto/auth.dto.js';

function forwardSetCookies(headers: Headers | undefined, response: Response): void {
  for (const cookie of headers?.getSetCookie() ?? []) response.append('set-cookie', cookie);
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthCompatibilityService) {}

  @Get('csrf')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  csrf(): void {
    // Compatibility endpoint. Better Auth enforces trusted origins and SameSite cookies.
  }

  @Post('login')
  @Public()
  async login(
    @Body() input: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ActorContext> {
    const result = await this.auth.login(
      input.userName,
      input.password,
      input.rememberMe === true,
      request.headers,
    );
    forwardSetCookies(result.headers, response);
    return result.data;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    forwardSetCookies(await this.auth.logout(request.headers), response);
  }

  @Get('me')
  me(@CurrentActor() actor: ActorContext): ActorContext {
    return actor;
  }

  @Post('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentActor() actor: ActorContext,
    @Body() input: ChangePasswordDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    forwardSetCookies(
      await this.auth.changePassword(actor, input.currentPassword, input.newPassword, request.headers),
      response,
    );
  }

  @Post('password/reset/request')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  async requestReset(@Body() input: RequestPasswordResetDto) {
    await this.auth.requestPasswordReset(input.email);
    return { message: 'Nếu tài khoản tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi.' };
  }

  @Post('password/reset/confirm')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmReset(@Body() input: ConfirmPasswordResetDto): Promise<void> {
    await this.auth.confirmPasswordReset(input.email, input.token, input.newPassword);
  }
}
