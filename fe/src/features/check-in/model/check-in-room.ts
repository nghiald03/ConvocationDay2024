export type CheckInRooms = {
  rooms: string[];
  /** null: tài khoản được thao tác mọi phòng; mảng rỗng: chưa được phân phòng nào. */
  assignedRooms: string[] | null;
};

const roomKey = (room: string) => room.trim().toLowerCase();

/** Chỉ dùng để khóa giao diện; backend mới là nơi chặn quyền thật sự. */
export function canCheckInRoom(
  assignedRooms: string[] | null | undefined,
  room: string | null | undefined
) {
  if (assignedRooms === null) return true;
  if (!assignedRooms || !room) return false;
  return assignedRooms.some((assigned) => roomKey(assigned) === roomKey(room));
}
