import { describe, expect, test } from 'bun:test';
import { io } from 'socket.io-client';

const realtimeUrl = process.env.REALTIME_TEST_URL;

describe.skipIf(!realtimeUrl)('Socket.IO authentication', () => {
  test('từ chối kết nối thiếu session bằng thông báo tiếng Việt', async () => {
    const message = await new Promise<string>((resolve, reject) => {
      const socket = io(`${realtimeUrl}/events`, {
        path: '/socket.io',
        transports: ['websocket'],
        reconnection: false,
        timeout: 5_000,
      });
      const timeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Không nhận được lỗi xác thực Socket.IO đúng thời hạn.'));
      }, 6_000);
      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        socket.disconnect();
        resolve(error.message);
      });
    });
    expect(message).toBe('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
  });
});
