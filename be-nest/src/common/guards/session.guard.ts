import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthSessionService } from '../../auth/auth-session.service.js';
import type { ActorContext } from './actor-context.js';
import { PUBLIC_ROUTE } from './public.decorator.js';

export type AuthenticatedRequest = Request & { actor?: ActorContext };

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: AuthSessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const actor = await this.sessions.resolve(request.headers);
    if (!actor) {
      throw new UnauthorizedException({
        code: 'auth/unauthorized',
        message: 'Bạn cần đăng nhập để tiếp tục.',
      });
    }
    request.actor = actor;
    return true;
  }
}
