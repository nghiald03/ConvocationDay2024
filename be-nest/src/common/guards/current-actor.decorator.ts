import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { ActorContext } from './actor-context.js';
import type { AuthenticatedRequest } from './session.guard.js';

export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ActorContext | undefined =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().actor,
);
