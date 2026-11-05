/**
 * Thứ tự gọi trên LED đi theo số ghế (xem chairOrder), nên trả về ghế đứng sau mọi ghế của phiên.
 * Sơ đồ theo hàng (A01...) không có ghế trống đáng tin ở cuối, nên người được xếp cuối vào hàng Z riêng.
 */
export function nextChairAtEnd(chairs: (string | null)[]): string {
  const assigned = chairs.filter((chair): chair is string => chair !== null);
  if (assigned.some((chair) => /^[A-Za-z]+[0-9]+$/.test(chair))) {
    const lateNumbers = assigned.flatMap((chair) => {
      const match = /^Z([0-9]+)$/i.exec(chair);
      return match ? [Number(match[1])] : [];
    });
    return `Z${String(Math.max(0, ...lateNumbers) + 1).padStart(2, '0')}`;
  }
  const numbers = assigned.filter((chair) => /^[0-9]+$/.test(chair)).map(Number);
  return String(Math.max(0, ...numbers) + 1);
}
