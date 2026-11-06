const LATE_ROWS = ['Z', ...Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ', (letter) => `Z${letter}`)];

function parseRowSeat(chair: string) {
  const match = /^([A-Za-z]+)([0-9]+)$/.exec(chair);
  if (!match) return null;
  return { row: match[1]!.toUpperCase(), digits: match[2]!, number: Number(match[2]) };
}

type Seat = NonNullable<ReturnType<typeof parseRowSeat>>;

/** So sánh như chairOrder bên LED: theo chữ hàng rồi theo số ghế. */
function compareSeats(a: Seat, b: Seat) {
  if (a.row !== b.row) return a.row < b.row ? -1 : 1;
  return a.number - b.number;
}

function realSeatsOf(chairs: (string | null)[]) {
  return chairs
    .flatMap((chair) => (chair === null ? [] : (parseRowSeat(chair) ?? [])))
    .filter((seat) => !LATE_ROWS.includes(seat.row));
}

/**
 * Ghế tự động khi chuyển ca: ngay sau ghế thật cuối cùng của phiên đích trong side đó, ví dụ side Left
 * của phiên mới chỉ tới I28 thì nhận I29; hết dãy số của side (vd Left 25-50) thì sang đầu hàng kế tiếp.
 * Dãy số của side lấy từ mọi ghế của side đó ở mọi phiên, nên không bao giờ lấn sang side khác.
 * Chỉ xuống hàng Z (nextChairAtEnd) khi side hết hàng thật hoặc LED của phiên đích đã chiếu qua vị trí đó.
 */
export function nextChairAfterSession(
  sessionChairs: (string | null)[],
  hallChairs: (string | null)[],
  ledCurrentChair: string | null,
): string {
  const atEnd = () => nextChairAtEnd(sessionChairs, hallChairs);
  const sessionSeats = realSeatsOf(sessionChairs);
  const rangeSeats = [...realSeatsOf(hallChairs), ...sessionSeats];
  if (rangeSeats.length === 0) return atEnd();

  const first = Math.min(...rangeSeats.map((seat) => seat.number));
  const last = Math.max(...rangeSeats.map((seat) => seat.number));
  const padded = rangeSeats.some((seat) => seat.digits.length > 1 && seat.digits.startsWith('0'));
  const lastInSession = [...sessionSeats].sort(compareSeats).at(-1);

  let row: string;
  let number: number;
  if (!lastInSession) {
    row = [...rangeSeats].sort(compareSeats)[0]!.row;
    number = first;
  } else if (lastInSession.number < last) {
    row = lastInSession.row;
    number = Math.max(first, lastInSession.number + 1);
  } else {
    // Chỉ đi tiếp hàng một chữ cái (A → B ...); hàng tiếp theo là Z thì đã hết hàng thật.
    if (!/^[A-Y]$/.test(lastInSession.row)) return atEnd();
    row = String.fromCharCode(lastInSession.row.charCodeAt(0) + 1);
    number = first;
  }
  if (LATE_ROWS.includes(row)) return atEnd();

  const candidate: Seat = { row, digits: String(number), number };
  const current = ledCurrentChair ? parseRowSeat(ledCurrentChair) : null;
  if (current && compareSeats(current, candidate) >= 0) return atEnd();

  return `${row}${padded ? String(number).padStart(2, '0') : number}`;
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
  if (!nextRow) throw new Error('Đã hết hàng ghế cuối phiên của side này.');
  return format(nextRow, first);
}
