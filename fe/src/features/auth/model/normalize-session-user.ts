import type { SessionUser } from './session-user';

export interface SessionUserPayload {
  id?: string;
  userId?: string;
  email: string;
  fullName: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
}

export function normalizeSessionUser(payload: SessionUserPayload): SessionUser {
  const id = payload.userId ?? payload.id;
  if (!id) throw new Error('Response phiên đăng nhập thiếu mã người dùng.');

  const roles = payload.roles ?? (payload.role ? [payload.role] : []);
  return {
    id,
    email: payload.email,
    fullName: payload.fullName,
    role: payload.role ?? roles[0],
    roles,
    permissions: payload.permissions ?? [],
  };
}
