import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSIONS = 'convocation:required-permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS, permissions);
