import { safeRedirect } from './safe-redirect.mjs';

const LOGIN_PATH = '/';

/** Trang vào sau khi đăng nhập mà không có trang cần quay lại: tài khoản NO về thông báo, còn lại về trang tổng quan. */
export function defaultLandingPath(role: string | null | undefined): string {
  return role === 'NO' ? '/notify' : '/tutorial';
}

/**
 * Đường dẫn trang đăng nhập khi phiên mất, kèm trang đang xem để đăng nhập xong quay lại đúng chỗ.
 * Trang đăng nhập hoặc đường dẫn không an toàn thì không đính kèm (tránh chuyển hướng ra ngoài).
 */
export function loginUrlFor(currentPath: string): string {
  const back = safeRedirect(currentPath, '');
  if (!back || back === LOGIN_PATH || back.startsWith(`${LOGIN_PATH}?`)) return LOGIN_PATH;
  return `${LOGIN_PATH}?returnTo=${encodeURIComponent(back)}`;
}

/** Nơi chuyển tới sau khi đăng nhập: trang `returnTo` nếu hợp lệ và cùng ứng dụng, không thì trang mặc định theo vai trò. */
export function pathAfterLogin(returnTo: unknown, role: string | null | undefined): string {
  return safeRedirect(returnTo, defaultLandingPath(role));
}
