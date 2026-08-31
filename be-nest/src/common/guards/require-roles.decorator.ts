import { SetMetadata } from '@nestjs/common';

export const REQUIRED_ROLES = 'convocation:required-roles';
export const RequireRoles = (...roles: string[]) => SetMetadata(REQUIRED_ROLES, roles);
