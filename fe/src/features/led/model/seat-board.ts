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

/** Tên trạng thái điểm danh để hiển thị. */
export const SEAT_STATE_LABEL: Record<SeatState, string> = {
  present: 'Đúng giờ',
  late: 'Đến trễ',
  waiting: 'Chưa check-in',
  absent: 'Vắng',
};

/** Nhấn mạnh cho điều phối: người LED đang gọi và người kế tiếp. Không thay trạng thái điểm danh của ô. */
export type SeatEmphasis = 'current' | 'next';

export type SeatOccupant = {
  studentCode: string;
  fullName: string;
  chair: string | null | undefined;
  /** Ghế cũ của người bị xếp xuống cuối phiên; họ vẫn ngồi ở đó. */
  originalChair?: string | null;
  /** Trạng thái LED của người này: Current, Next, Back hoặc rỗng. */
  statusBaChelor?: string | null;
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

/** Người đang được LED gọi (Current) hoặc sắp gọi (Next); còn lại không nhấn mạnh. */
export function seatEmphasis(occupant: Pick<SeatOccupant, 'statusBaChelor'>): SeatEmphasis | null {
  if (occupant.statusBaChelor === 'Current') return 'current';
  if (occupant.statusBaChelor === 'Next') return 'next';
  return null;
}

export type BuildSeatBoardOptions = {
  /** Đặt người bị xếp xuống cuối vào ô ghế cũ của họ thay vì danh sách "ngoài lưới". */
  useOriginalSeat?: boolean;
  /** Đánh dấu người LED đang gọi / sắp gọi. Mặc định tắt: sơ đồ check-in đầu giờ chỉ cho biết ai đã check-in. */
  showCalling?: boolean;
};

export type SideSummary = { total: number; checkedIn: number; late: number; hallName: string | null };

export function buildSeatBoard(occupants: SeatOccupant[], options: BuildSeatBoardOptions = {}) {
  type Entry = SeatOccupant & { state: SeatState; emphasis: SeatEmphasis | null };
  const seats = new Map<string, Entry>();
  const outside: Entry[] = [];
  const summary: Record<SeatSide, SideSummary> = {
    Left: { total: 0, checkedIn: 0, late: 0, hallName: null },
    Right: { total: 0, checkedIn: 0, late: 0, hallName: null },
  };

  for (const occupant of occupants) {
    const state = seatState(occupant);
    const entry: Entry = { ...occupant, state, emphasis: options.showCalling ? seatEmphasis(occupant) : null };
    const grid =
      (options.useOriginalSeat ? parseGridChair(occupant.originalChair) : null) ?? parseGridChair(occupant.chair);
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

/** Người LED đang gọi ở một bên, kèm chỗ họ thật sự ngồi (ghế cũ nếu bị xếp xuống cuối phiên). */
export function findCalling(occupants: SeatOccupant[], side: SeatSide) {
  const current = occupants.find(
    (occupant) =>
      occupant.statusBaChelor === 'Current' && sideOfChair(occupant.originalChair ?? occupant.chair) === side,
  );
  if (!current) return null;
  return {
    fullName: current.fullName,
    studentCode: current.studentCode,
    seat: current.originalChair ?? current.chair ?? null,
    ledChair: current.chair ?? null,
    late: current.attendanceStatus === 2,
  };
}
