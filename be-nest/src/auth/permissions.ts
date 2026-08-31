export const Permission = {
  ManageSystem: 'system.manage',
  ManageHalls: 'halls.manage',
  ManageSessions: 'sessions.manage',
  ManageBachelors: 'bachelors.manage',
  CheckIn: 'checkin.execute',
  RequestPhotoQueue: 'photo-queue.request',
  ControlLed: 'led.control',
  ControlPhotoQueue: 'photo-queue.control',
  ManageNotifications: 'notifications.manage',
  BroadcastNotifications: 'notifications.broadcast',
  ManageMedia: 'media.manage',
} as const;

export type PermissionName = (typeof Permission)[keyof typeof Permission];

export const permissionsByRole: Readonly<Record<string, readonly PermissionName[]>> = {
  MN: Object.values(Permission),
  CK: [Permission.CheckIn],
  PQ: [Permission.RequestPhotoQueue],
  MC: [Permission.ControlLed],
  PC: [Permission.ControlPhotoQueue],
  US: [Permission.ControlLed],
  NO: [Permission.ManageNotifications, Permission.BroadcastNotifications],
};

export function expandPermissions(roles: readonly string[]): string[] {
  return [...new Set(roles.flatMap((role) => permissionsByRole[role.toUpperCase()] ?? []))].sort();
}
