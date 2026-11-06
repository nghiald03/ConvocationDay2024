/** Màu gần với bảng màu chữ của Zalo: cam cho tên và MSSV, đỏ cho lời nhắc khẩn. */
const ORANGE = '#F57C00';
const RED = '#D32F2F';

const RULE = '━━━━━━━━━━━━━━━━━━━━';
/** Khi tân cử nhân chưa được xếp phòng check-in. */
const NO_ROOM_TEXT = 'CHECK-IN';

export type CheckInReminderInput = {
  fullName: string;
  studentCode: string;
  /** Phòng check-in của tân cử nhân; rỗng thì nhắc chung là "phòng CHECK-IN". */
  room?: string | null;
  /** Năm ghi ở cuối tin; mặc định là năm hiện tại. */
  year?: number;
};

export type CheckInReminder = {
  /** Bản chữ thường, dán được vào mọi nơi (không màu, không đậm). */
  text: string;
  /** Bản có định dạng (đậm, nghiêng, màu, cỡ chữ) để dán vào Zalo. */
  html: string;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const clean = (value: string | null | undefined) => (value ?? '').trim();

/**
 * Tin nhắc tân cử nhân chưa check-in, theo mẫu Ban Tổ chức dùng trên Zalo, điền sẵn họ tên, MSSV và phòng.
 * Trả về cả bản chữ thường và bản HTML có định dạng; trình duyệt đặt cả hai vào clipboard,
 * ô soạn tin của Zalo dùng bản có định dạng nếu hỗ trợ, nếu không thì dùng bản chữ thường.
 */
export function buildCheckInReminder(input: CheckInReminderInput): CheckInReminder {
  const name = clean(input.fullName);
  const code = clean(input.studentCode);
  const room = clean(input.room) || NO_ROOM_TEXT;
  const year = input.year ?? new Date().getFullYear();

  const text = [
    '📣 THÔNG BÁO CHECK-IN',
    RULE,
    '',
    `Bạn Tân Cử nhân: ${name},`,
    `Mã số sinh viên: ${code}`,
    '',
    `Ban Tổ chức chưa ghi nhận thông tin điểm danh của bạn. Vui lòng NHANH CHÓNG DI CHUYỂN ĐẾN PHÒNG ${room} để hoàn tất check-in.`,
    '',
    'Trân Trọng,',
    `Ban Tổ chức Lễ Tốt nghiệp ${year}`,
  ].join('\n');

  const highlight = (value: string) =>
    `<span style="color:${ORANGE};font-size:1.2em"><b>${escapeHtml(value)}</b></span>`;
  const html = [
    `<b>📣 THÔNG BÁO CHECK-IN</b>`,
    RULE,
    '<br>',
    `<b>Bạn Tân Cử nhân:</b> ${highlight(name)},`,
    `Mã số sinh viên: ${highlight(code)}`,
    '<br>',
    `Ban Tổ chức chưa ghi nhận thông tin điểm danh của bạn. Vui lòng <span style="color:${RED}"><b>NHANH CHÓNG DI CHUYỂN ĐẾN PHÒNG</b></span> <span style="font-size:1.3em"><b>${escapeHtml(room)}</b></span> để hoàn tất check-in.`,
    '<br>',
    '<i>Trân Trọng,</i>',
    `<b>Ban Tổ chức Lễ Tốt nghiệp ${year}</b>`,
  ]
    .map((line) => (line === '<br>' ? line : `${line}<br>`))
    .join('');

  return { text, html };
}
