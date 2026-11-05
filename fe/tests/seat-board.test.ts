import { describe, expect, test } from 'bun:test';
import {
  SEAT_BLOCKS,
  buildSeatBoard,
  formatSeatNumber,
  givenName,
  sideOfChair,
  parseGridChair,
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
