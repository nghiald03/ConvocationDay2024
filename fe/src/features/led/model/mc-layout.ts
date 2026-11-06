export const FONT_SCALE_MIN = 0.7;
export const FONT_SCALE_MAX = 2;
export const FONT_SCALE_STEP = 0.1;
export const FONT_SCALE_DEFAULT = 1;

export const SPLIT_MIN = 25;
export const SPLIT_MAX = 75;
export const SPLIT_DEFAULT = 50;
/** Mỗi lần bấm phím mũi tên trên thanh kéo, tính theo % bề rộng. */
export const SPLIT_KEY_STEP = 2;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Đọc số đã lưu trong trình duyệt; sai hoặc ngoài khoảng thì dùng giá trị mặc định. */
export function readStoredNumber(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw === null || raw.trim() === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

/** Tăng (1) hoặc giảm (-1) một bậc cỡ chữ, giữ trong khoảng cho phép và làm tròn một chữ số thập phân. */
export function stepFontScale(current: number, direction: 1 | -1): number {
  const next = clamp(current + direction * FONT_SCALE_STEP, FONT_SCALE_MIN, FONT_SCALE_MAX);
  return Math.round(next * 10) / 10;
}

/** Cỡ chữ gốc (rem) nhân hệ số, ví dụ `scaledRem(1.5, 1.2)` là "1.8rem". */
export function scaledRem(baseRem: number, scale: number): string {
  return `${Number((baseRem * scale).toFixed(3))}rem`;
}

/** Giữ tỉ lệ bề rộng bên trái trong khoảng cho phép để không thẻ nào bị ép quá nhỏ. */
export function clampSplit(percent: number): number {
  return clamp(percent, SPLIT_MIN, SPLIT_MAX);
}

/** Tỉ lệ (%) bề rộng bên trái theo vị trí con trỏ trong khung chứa hai thẻ. */
export function splitFromPointer(clientX: number, containerLeft: number, containerWidth: number): number {
  if (containerWidth <= 0) return SPLIT_DEFAULT;
  return clampSplit(((clientX - containerLeft) / containerWidth) * 100);
}
