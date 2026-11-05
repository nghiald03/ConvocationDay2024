const LATE_ROWS = ['Z', ...Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ', (letter) => `Z${letter}`)];

function parseRowSeat(chair: string) {
  const match = /^([A-Za-z]+)([0-9]+)$/.exec(chair);
  if (!match) return null;
  return { row: match[1]!.toUpperCase(), digits: match[2]!, number: Number(match[2]) };
}

/**
 * Trả về ghế đứng sau mọi ghế của phiên trong cùng hội trường (LED gọi theo chairOrder).
 * Số ghế quyết định bên ngồi (Right 1-24, Left 25-50), nên hàng ảo Z chỉ dùng dãy số của hội trường;
 * hết dãy thì sang hàng ZA, ZB... thay vì tăng số sang bên kia.
 */
export function nextChairAtEnd(
  sessionChairs: (string | null)[],
  hallChairs: (string | null)[] = sessionChairs,
): string {
  const assigned = (chairs: (string | null)[]) =>
    chairs.filter((chair): chair is string => chair !== null);
  const hallSeats = assigned(hallChairs).flatMap((chair) => parseRowSeat(chair) ?? []);
  const sessionSeats = assigned(sessionChairs).flatMap((chair) => parseRowSeat(chair) ?? []);

  if (hallSeats.length === 0 && sessionSeats.length === 0) {
    const numbers = assigned(sessionChairs).filter((chair) => /^[0-9]+$/.test(chair)).map(Number);
    return String(Math.max(0, ...numbers) + 1);
  }

  const realSeats = [...hallSeats, ...sessionSeats].filter((seat) => !LATE_ROWS.includes(seat.row));
  const first = realSeats.length ? Math.min(...realSeats.map((seat) => seat.number)) : 1;
  const last = realSeats.length ? Math.max(...realSeats.map((seat) => seat.number)) : Infinity;
  const format = (row: string, number: number) => {
    const padded = realSeats.some((seat) => seat.digits.length > 1 && seat.digits.startsWith('0'));
    return `${row}${padded ? String(number).padStart(2, '0') : number}`;
  };

  const issued = sessionSeats
    .filter((seat) => LATE_ROWS.includes(seat.row))
    .map((seat) => ({ rowIndex: LATE_ROWS.indexOf(seat.row), number: seat.number }))
    .sort((a, b) => a.rowIndex - b.rowIndex || a.number - b.number)
    .at(-1);
  if (!issued) return format(LATE_ROWS[0]!, first);
  if (issued.number < last) return format(LATE_ROWS[issued.rowIndex]!, Math.max(first, issued.number + 1));

  const nextRow = LATE_ROWS[issued.rowIndex + 1];
  if (!nextRow) throw new Error('Đã hết hàng ghế cuối phiên của hội trường này.');
  return format(nextRow, first);
}
