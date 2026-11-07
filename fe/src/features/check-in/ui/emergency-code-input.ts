/** Hướng dẫn lấy mã khẩn cấp; cùng mã với force check-in. */
export const EMERGENCY_CODE_HINT =
  'Hỏi Check-in Lead hoặc Manager để lấy mã 4 ký tự (đổi sau mỗi 5 phút).';

/** Ô nhập mã khẩn cấp 4 ký tự, đặt vào `content` của popup swal. */
export function createEmergencyCodeInput(): HTMLInputElement {
  const input = document.createElement('input');
  input.className = 'swal-content__input';
  input.autocomplete = 'off';
  input.autocapitalize = 'characters';
  input.spellcheck = false;
  input.maxLength = 4;
  input.placeholder = 'Mã 4 ký tự';
  input.style.textTransform = 'uppercase';
  input.style.letterSpacing = '0.3em';
  return input;
}
