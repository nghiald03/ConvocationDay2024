import { ForbiddenException } from '@nestjs/common';

export type CheckInRoomScope =
  | { unrestricted: true }
  | { unrestricted: false; rooms: string[] };

const roomKey = (room: string) => room.trim().toLowerCase();

export function assertCheckInRoomAllowed(scope: CheckInRoomScope, room: string | null): void {
  if (scope.unrestricted) return;
  if (room === null) {
    throw new ForbiddenException({
      code: 'checkin/room-unassigned',
      message: 'Tân cử nhân chưa được xếp phòng check-in, vui lòng liên hệ quản lý.',
    });
  }
  if (!scope.rooms.some((allowed) => roomKey(allowed) === roomKey(room))) {
    throw new ForbiddenException({
      code: 'checkin/room-forbidden',
      message: `Bạn không được phân quyền check-in phòng ${room}.`,
    });
  }
}
