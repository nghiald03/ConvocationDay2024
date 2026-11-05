export const FORCE_CODE_VIEWER_ROLES = ['CL', 'MN'];

export function canViewForceCode(roles: readonly string[] | undefined) {
  return (roles ?? []).some((role) => FORCE_CODE_VIEWER_ROLES.includes(role.toUpperCase()));
}

export function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
