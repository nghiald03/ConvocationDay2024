import { describe, expect, test } from 'bun:test';
import {
  SEAT_BLOCKS,
  buildSeatBoard,
  formatSeatNumber,
  givenName,
  sideOfChair,
  parseGridChair,
  findCalling,
  SEAT_STATE_LABEL,
  seatEmphasis,
  seatState,
} from '../src/features/led/model/seat-board';

describe('seat board', () => {
  test('bố cục khớp bản in: Left 25–50, Right 24–01', () => {
    expect(SEAT_BLOCKS.map((block) => [block.side, block.numbers[0], block.numbers[block.numbers.length - 1]])).toEqual([
      ['Left', 25, 39],
      ['Left', 40, 50],
      ['Right', 24, 14],
      ['Right', 13, 1],
    ]);
    expect(SEAT_BLOCKS.flatMap((block) => block.numbers).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 50 }, (_, index) => index + 1),
    );
  });

  test('đọc ghế trong lưới, bỏ ghế cuối hàng Z', () => {
    expect(parseGridChair('A1')).toEqual({ row: 'A', number: 1 });
    expect(parseGridChair('j09')).toEqual({ row: 'J', number: 9 });
    expect(parseGridChair('Z1')).toBeNull();
    expect(parseGridChair('ZA25')).toBeNull();
    expect(parseGridChair('K1')).toBeNull();
    expect(parseGridChair(null)).toBeNull();
  });

  test('trạng thái: trễ gồm cả force check-in', () => {
    expect(seatState({ studentCode: 'a', fullName: '', chair: 'A1', checkIn: true, attendanceStatus: 1 })).toBe('present');
    expect(seatState({ studentCode: 'a', fullName: '', chair: 'A1', checkIn: true, attendanceStatus: 2 })).toBe('late');
    expect(seatState({ studentCode: 'a', fullName: '', chair: 'A1', checkIn: false, attendanceStatus: 0 })).toBe('waiting');
    expect(seatState({ studentCode: 'a', fullName: '', chair: 'A1', checkIn: false, attendanceStatus: 3 })).toBe('absent');
  });

  test('gom theo ghế và đếm từng bên, ghế Z tính vào bên của số ghế', () => {
    const board = buildSeatBoard([
      { studentCode: 'r1', fullName: '', chair: 'A1', checkIn: true, attendanceStatus: 1, hallName: 'Right' },
      { studentCode: 'r2', fullName: '', chair: 'Z2', checkIn: true, attendanceStatus: 2, hallName: 'Right' },
      { studentCode: 'l1', fullName: '', chair: 'B25', checkIn: false, attendanceStatus: 0, hallName: 'Left' },
      { studentCode: 'l2', fullName: '', chair: 'Z25', checkIn: true, attendanceStatus: 2, hallName: 'Left' },
    ]);
    expect(board.seats.get('A1')?.state).toBe('present');
    expect(board.seats.get('B25')?.state).toBe('waiting');
    expect(board.outside.map((seat) => seat.chair)).toEqual(['Z2', 'Z25']);
    expect(board.summary.Right).toEqual({ total: 2, checkedIn: 2, late: 1, hallName: 'Right' });
    expect(board.summary.Left).toEqual({ total: 2, checkedIn: 1, late: 1, hallName: 'Left' });
  });

  test('tên gọn và bên của ghế', () => {
    expect(givenName('Lê Đại  Nghĩa ')).toBe('Nghĩa');
    expect(givenName(null)).toBe('');
    expect(sideOfChair('A24')).toBe('Right');
    expect(sideOfChair('Z25')).toBe('Left');
    expect(sideOfChair('ZA1')).toBe('Right');
    expect(sideOfChair(null)).toBeNull();
  });

  test('số ghế hiển thị 2 chữ số', () => {
    expect(formatSeatNumber(1)).toBe('01');
    expect(formatSeatNumber(25)).toBe('25');
  });
});

describe('attendanceLabel', () => {
  test('force check-in (trễ) hiện Late trong file xuất', async () => {
    const { attendanceLabel } = await import('../src/features/bachelor/ui/export-bachelors-to-excel');
    expect(attendanceLabel(1)).toBe('On time');
    expect(attendanceLabel(2)).toBe('Late');
    expect(attendanceLabel(3)).toBe('Absent');
    expect(attendanceLabel(0)).toBe('');
    expect(attendanceLabel(null)).toBe('');
  });
});

describe('sơ đồ ghế trực tiếp: ghế cũ và đang gọi', () => {
  const lateMoved = {
    studentCode: 'late1',
    fullName: 'Đỗ Trần Lâm',
    chair: 'Z1',
    originalChair: 'C10',
    checkIn: true,
    attendanceStatus: 2,
    hallName: 'Right',
  };

  test('mặc định (sơ đồ đầu giờ) vẫn để người bị đẩy cuối ở danh sách ngoài lưới', () => {
    const board = buildSeatBoard([lateMoved]);

    expect(board.seats.has('C10')).toBe(false);
    expect(board.outside.map((seat) => seat.chair)).toEqual(['Z1']);
  });

  test('useOriginalSeat: người bị đẩy cuối hiện ở ô ghế cũ với trạng thái trễ, không còn ngoài lưới', () => {
    const board = buildSeatBoard([lateMoved], { useOriginalSeat: true });

    expect(board.seats.get('C10')).toMatchObject({ studentCode: 'late1', state: 'late' });
    expect(board.outside).toHaveLength(0);
    expect(board.summary.Right.late).toBe(1);
  });

  test('useOriginalSeat: người không có ghế cũ giữ ghế hiện tại, ghế cũ hỏng thì dùng ghế hiện tại', () => {
    const board = buildSeatBoard(
      [
        { studentCode: 'a', fullName: '', chair: 'D1', checkIn: true, attendanceStatus: 2 },
        { studentCode: 'b', fullName: '', chair: 'E2', originalChair: 'khong-hop-le', checkIn: true, attendanceStatus: 1 },
      ],
      { useOriginalSeat: true },
    );

    expect(board.seats.get('D1')?.studentCode).toBe('a');
    expect(board.seats.get('E2')?.studentCode).toBe('b');
  });

  test('seatEmphasis: Current là đang gọi, Next là sắp gọi, còn lại không nhấn mạnh', () => {
    expect(seatEmphasis({ statusBaChelor: 'Current' })).toBe('current');
    expect(seatEmphasis({ statusBaChelor: 'Next' })).toBe('next');
    expect(seatEmphasis({ statusBaChelor: 'Back' })).toBeNull();
    expect(seatEmphasis({ statusBaChelor: null })).toBeNull();
    expect(seatEmphasis({})).toBeNull();
  });

  test('ô của người đang gọi mang dấu nhấn mạnh trong sơ đồ', () => {
    const board = buildSeatBoard(
      [{ ...lateMoved, statusBaChelor: 'Current' }],
      { useOriginalSeat: true, showCalling: true },
    );

    expect(board.seats.get('C10')?.emphasis).toBe('current');
  });

  test('mặc định không đánh dấu LED: sơ đồ check-in đầu giờ chỉ cho biết ai đã check-in', () => {
    const board = buildSeatBoard([
      { studentCode: 'a', fullName: '', chair: 'A1', checkIn: true, attendanceStatus: 1, statusBaChelor: 'Current' },
      { studentCode: 'b', fullName: '', chair: 'A2', checkIn: true, attendanceStatus: 1, statusBaChelor: 'Next' },
    ]);

    expect(board.seats.get('A1')?.emphasis).toBeNull();
    expect(board.seats.get('A2')?.emphasis).toBeNull();
  });
});

describe('findCalling', () => {
  const people = [
    { studentCode: 'r', fullName: 'Bên phải', chair: 'A5', statusBaChelor: 'Current', attendanceStatus: 1 },
    { studentCode: 'l', fullName: 'Bên trái', chair: 'Z25', originalChair: 'C30', statusBaChelor: 'Current', attendanceStatus: 2 },
    { studentCode: 'x', fullName: 'Chờ', chair: 'A6', statusBaChelor: 'Next', attendanceStatus: 1 },
  ];

  test('mỗi bên có người đang gọi riêng, lấy ghế thật sự ngồi', () => {
    expect(findCalling(people, 'Right')).toMatchObject({ studentCode: 'r', seat: 'A5', late: false });
    expect(findCalling(people, 'Left')).toMatchObject({ studentCode: 'l', seat: 'C30', ledChair: 'Z25', late: true });
  });

  test('chưa ai được gọi ở bên đó thì null', () => {
    expect(findCalling([people[2]!], 'Right')).toBeNull();
    expect(findCalling([], 'Left')).toBeNull();
  });
});

describe('SEAT_STATE_LABEL', () => {
  test('có nhãn tiếng Việt cho mọi trạng thái điểm danh', () => {
    expect(SEAT_STATE_LABEL).toEqual({
      present: 'Đúng giờ',
      late: 'Đến trễ',
      waiting: 'Chưa check-in',
      absent: 'Vắng',
    });
  });
});
