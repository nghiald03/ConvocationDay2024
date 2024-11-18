import { jwtDecode } from 'jwt-decode';

export const isAccessTokenValid = (): boolean => {
  if (typeof window === 'undefined') {
    // Nếu đang chạy trên server, không có localStorage
    return false;
  }

  const accessToken = localStorage.getItem('accessToken');

  if (!accessToken) {
    // Nếu không có token
    return false;
  }

  try {
    // Giải mã token
    const decodedToken = jwtDecode(accessToken) as { exp?: number };

    // Kiểm tra nếu token có `exp` và hạn sử dụng
    if (!decodedToken?.exp) {
      return false;
    }

    const currentTime = Math.floor(Date.now() / 1000); // Thời gian hiện tại (giây)
    return decodedToken.exp > currentTime; // Token còn hạn
  } catch (error) {
    console.error('Invalid accessToken:', error);
    return false; // Token không hợp lệ
  }
};
