import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from './session.guard.js';
import { REQUIRED_PERMISSIONS } from './require-permissions.decorator.js';
import { REQUIRED_ROLES } from './require-roles.decorator.js';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS, [
      context.getHandler(),
      context.getClass(),
    ]);
    const actor = context.switchToHttp().getRequest<AuthenticatedRequest>().actor;
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(REQUIRED_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles?.length && !requiredRoles.some((role) => actor?.roles.includes(role))) {
      throw new ForbiddenException({
        code: 'auth/missing-role',
        message: 'Bạn không có vai trò cần thiết để thực hiện thao tác này.',
        details: { required: requiredRoles },
      });
    }
    if (!required?.length) return true;
    if (!actor || required.some((permission) => !actor.permissions.includes(permission))) {
      throw new ForbiddenException({
        code: 'auth/missing-permission',
        message: 'Bạn không có quyền thực hiện thao tác này.',
        details: { required },
      });
    }
    return true;
  }
}
