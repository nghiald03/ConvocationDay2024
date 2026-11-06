import { describe, expect, test } from 'bun:test';
import { loginUrlFor, pathAfterLogin, defaultLandingPath } from '../src/features/auth/model/login-redirect';
import {
  isServerInitiatedDisconnect,
  isUnauthorizedConnectError,
  reconnectAfterServerDisconnect,
} from '../src/lib/realtime/reconnect';

describe('loginUrlFor', () => {
  test('đính kèm trang đang xem để đăng nhập xong quay lại đúng chỗ', () => {
    expect(loginUrlFor('/led/seat-live?x=1')).toBe('/?returnTo=%2Fled%2Fseat-live%3Fx%3D1');
  });

  test('đang ở trang đăng nhập hoặc đường dẫn không an toàn thì không đính kèm', () => {
    expect(loginUrlFor('/')).toBe('/');
    expect(loginUrlFor('/?returnTo=%2Fa')).toBe('/');
    expect(loginUrlFor('https://evil.example/x')).toBe('/');
    expect(loginUrlFor('//evil.example')).toBe('/');
    expect(loginUrlFor('javascript:alert(1)')).toBe('/');
  });
});

describe('pathAfterLogin', () => {
  test('quay lại đúng trang nếu hợp lệ', () => {
    expect(pathAfterLogin('/checkin/manual', 'CK')).toBe('/checkin/manual');
  });

  test('không có hoặc không an toàn thì về trang mặc định theo vai trò', () => {
    expect(pathAfterLogin(null, 'MN')).toBe('/tutorial');
    expect(pathAfterLogin(undefined, 'NO')).toBe('/notify');
    expect(pathAfterLogin('https://evil.example', 'MN')).toBe('/tutorial');
    expect(pathAfterLogin('//evil.example', 'NO')).toBe('/notify');
    expect(defaultLandingPath('NO')).toBe('/notify');
    expect(defaultLandingPath('CK')).toBe('/tutorial');
  });
});

describe('reconnectAfterServerDisconnect', () => {
  const noWait = () => Promise.resolve();

  test('phiên còn hợp lệ và nối được ngay lần đầu', async () => {
    const waits: number[] = [];
    const outcome = await reconnectAfterServerDisconnect({
      refreshSession: () => Promise.resolve(true),
      connect: () => Promise.resolve(true),
      wait: (ms) => {
        waits.push(ms);
        return Promise.resolve();
      },
    });

    expect(outcome).toBe('reconnected');
    expect(waits).toEqual([1000]);
  });

  test('phiên đã mất thì dừng, không cố nối', async () => {
    let connects = 0;
    const outcome = await reconnectAfterServerDisconnect({
      refreshSession: () => Promise.resolve(false),
      connect: () => {
        connects += 1;
        return Promise.resolve(true);
      },
      wait: noWait,
    });

    expect(outcome).toBe('session-lost');
    expect(connects).toBe(0);
  });

  test('nối thất bại thì thử lại theo khoảng chờ tăng dần rồi bỏ cuộc', async () => {
    const waits: number[] = [];
    let attempts = 0;
    const outcome = await reconnectAfterServerDisconnect({
      refreshSession: () => Promise.resolve(true),
      connect: () => {
        attempts += 1;
        return Promise.resolve(false);
      },
      wait: (ms) => {
        waits.push(ms);
        return Promise.resolve();
      },
    });

    expect(outcome).toBe('gave-up');
    expect(attempts).toBe(3);
    expect(waits).toEqual([1000, 3000, 10000]);
  });

  test('nối được ở lần thử sau', async () => {
    let attempts = 0;
    const outcome = await reconnectAfterServerDisconnect({
      refreshSession: () => Promise.resolve(true),
      connect: () => Promise.resolve(++attempts === 2),
      wait: noWait,
    });

    expect(outcome).toBe('reconnected');
    expect(attempts).toBe(2);
  });
});

describe('phân loại lý do ngắt kết nối', () => {
  test('chỉ lý do do server ngắt mới cần tự nối lại', () => {
    expect(isServerInitiatedDisconnect('io server disconnect')).toBe(true);
    expect(isServerInitiatedDisconnect('transport close')).toBe(false);
    expect(isServerInitiatedDisconnect('ping timeout')).toBe(false);
  });

  test('nhận ra lỗi bắt tay do phiên không hợp lệ', () => {
    expect(isUnauthorizedConnectError({ data: { code: 'auth/unauthorized' } })).toBe(true);
    expect(isUnauthorizedConnectError({ data: { code: 'auth/untrusted-origin' } })).toBe(false);
    expect(isUnauthorizedConnectError(null)).toBe(false);
  });
});
