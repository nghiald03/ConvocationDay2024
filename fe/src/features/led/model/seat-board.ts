/**
 * Sơ đồ ghế cố định của hội trường (theo bản in cũ), nhìn từ sân khấu xuống:
 * Left = ghế 25–50, Right = ghế 01–24, hàng A–J.
 * Không dùng trang "Sơ đồ chỗ ngồi" đang phát triển vì bố cục và số ghế ở đó còn thay đổi.
 */
export const SEAT_ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const;

export type SeatSide = 'Left' | 'Right';

export type SeatBlock = { side: SeatSide; numbers: number[] };

const range = (from: number, to: number) => {
  const step = from <= to ? 1 : -1;
  return Array.from({ length: Math.abs(to - from) + 1 }, (_, index) => from + index * step);
};

/** Các khối ghế từ trái sang phải, đúng thứ tự trên bản in. */
export const SEAT_BLOCKS: SeatBlock[] = [
  { side: 'Left', numbers: range(25, 39) },
  { side: 'Left', numbers: range(40, 50) },
  { side: 'Right', numbers: range(24, 14) },
  { side: 'Right', numbers: range(13, 1) },
];

export type SeatState = 'present' | 'late' | 'waiting' | 'absent';

export type SeatOccupant = {
  studentCode: string;
  fullName: string;
  chair: string | null | undefined;
  checkIn?: boolean | null;
  attendanceStatus?: number | null;
  hallName?: string | null;
};

export function sideOfSeatNumber(number: number): SeatSide {
  return number >= 25 ? 'Left' : 'Right';
}

export function seatKey(row: string, number: number) {
  return `${row}${number}`;
}

/** "A1", "a01" → { row: "A", number: 1 }; ghế ngoài lưới (Z1, ZA25, ...) → null. */
export function parseGridChair(chair: string | null | undefined) {
  const match = /^([A-J])0*([0-9]+)$/i.exec((chair ?? '').trim());
  if (!match) return null;
  const number = Number(match[2]);
  if (number < 1 || number > 50) return null;
  return { row: match[1]!.toUpperCase(), number };
}

/** attendanceStatus: 1 đúng giờ, 2 trễ (kể cả force check-in), 3 vắng. */
export function seatState(occupant: SeatOccupant): SeatState {
  if (occupant.checkIn) return occupant.attendanceStatus === 2 ? 'late' : 'present';
  return occupant.attendanceStatus === 3 ? 'absent' : 'waiting';
}

export type SideSummary = { total: number; checkedIn: number; late: number; hallName: string | null };

export function buildSeatBoard(occupants: SeatOccupant[]) {
  const seats = new Map<string, SeatOccupant & { state: SeatState }>();
  const outside: (SeatOccupant & { state: SeatState })[] = [];
  const summary: Record<SeatSide, SideSummary> = {
    Left: { total: 0, checkedIn: 0, late: 0, hallName: null },
    Right: { total: 0, checkedIn: 0, late: 0, hallName: null },
  };

  for (const occupant of occupants) {
    const state = seatState(occupant);
    const entry = { ...occupant, state };
    const grid = parseGridChair(occupant.chair);
    if (grid) seats.set(seatKey(grid.row, grid.number), entry);
    else outside.push(entry);

    const lateNumber = /([0-9]+)$/.exec(occupant.chair ?? '');
    const number = grid?.number ?? (lateNumber ? Number(lateNumber[1]) : null);
    if (number === null) continue;
    const side = summary[sideOfSeatNumber(number)];
    side.total += 1;
    if (occupant.checkIn) side.checkedIn += 1;
    if (state === 'late') side.late += 1;
    side.hallName ??= occupant.hallName ?? null;
  }

  outside.sort((a, b) => (a.chair ?? '').localeCompare(b.chair ?? '', undefined, { numeric: true }));
  return { seats, outside, summary };
}

/** Tên gọi (chữ cuối của họ tên) để in gọn trong ô ghế: "Lê Đại Nghĩa" → "Nghĩa". */
export function givenName(fullName: string | null | undefined) {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

export function sideOfChair(chair: string | null | undefined): SeatSide | null {
  const match = /([0-9]+)$/.exec((chair ?? '').trim());
  return match ? sideOfSeatNumber(Number(match[1])) : null;
}

export function formatSeatNumber(number: number) {
  return String(number).padStart(2, '0');
}
