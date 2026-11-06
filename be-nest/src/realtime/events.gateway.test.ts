import { describe, expect, test } from 'bun:test';
import {
  EventsGateway,
  isLoopbackDevelopmentOrigin,
  SESSION_CHECK_MAX_MS,
  SESSION_CHECK_MIN_MS,
  sessionCheckDelay,
} from './events.gateway.js';

describe('isLoopbackDevelopmentOrigin', () => {
  test('trusts localhost origins only in development', () => {
    expect(isLoopbackDevelopmentOrigin('http://localhost:3000', 'development')).toBe(true);
    expect(isLoopbackDevelopmentOrigin('http://127.0.0.1:3000', 'development')).toBe(true);
    expect(isLoopbackDevelopmentOrigin('http://localhost:3000', 'production')).toBe(false);
  });

  test('does not trust arbitrary LAN origins implicitly', () => {
    expect(isLoopbackDevelopmentOrigin('http://192.168.1.10:3000', 'development')).toBe(false);
  });
});

describe('EventsGateway: vào phòng khi kết nối', () => {
  const actor = (extra: Partial<{ userId: string; roles: string[] }> = {}) => ({
    userId: 'u1',
    email: 'u1@example.edu.vn',
    fullName: 'Người dùng',
    roles: ['MN', 'CK'],
    permissions: [],
    ...extra,
  });

  function createGateway(options: { actor?: ReturnType<typeof actor> | null; environment?: string } = {}) {
    const expiresAt = new Date(Date.now() + 60 * 60_000);
    const resolved = options.actor === undefined ? actor() : options.actor;
    const sessions = {
      resolveWithExpiry: () => Promise.resolve(resolved ? { actor: resolved, expiresAt } : null),
    };
    const config = {
      getOrThrow: () => 'http://localhost:3000,http://100.70.23.114:3001',
      get: (_key: string, fallback: string) => options.environment ?? fallback,
    };
    const gateway = new EventsGateway(sessions as never, {} as never, config as never);
    const joined: string[] = [];
    const socket = {
      handshake: { headers: { origin: 'http://localhost:3000' } as Record<string, string> },
      data: {} as Record<string, unknown>,
      join: (room: string) => {
        joined.push(room);
        return Promise.resolve();
      },
    };
    const authenticate = (target: typeof socket = socket) =>
      new Promise<Error | undefined>((resolve) =>
        void (gateway as unknown as {
          authenticateSocket: (s: unknown, next: (error?: Error) => void) => Promise<void>;
        }).authenticateSocket(target, resolve),
      );
    return { socket, joined, authenticate };
  }

  test('vào phòng của chính tài khoản và từng vai trò, rồi cho kết nối', async () => {
    const { socket, joined, authenticate } = createGateway();

    expect(await authenticate()).toBeUndefined();

    expect([...joined].sort()).toEqual(['role:CK', 'role:MN', 'user:u1']);
    expect(socket.data.actor).toMatchObject({ userId: 'u1' });
  });

  test('tài khoản không có vai trò chỉ vào phòng của chính mình', async () => {
    const { joined, authenticate } = createGateway({ actor: actor({ roles: [] }) });

    await authenticate();

    expect(joined).toEqual(['user:u1']);
  });

  test('không có phiên hợp lệ (hết hạn, bị khóa) thì từ chối và không vào phòng nào', async () => {
    const { joined, authenticate } = createGateway({ actor: null });

    const error = await authenticate();

    expect(error?.message).toContain('Phiên đăng nhập');
    expect((error as Error & { data: { code: string } }).data.code).toBe('auth/unauthorized');
    expect(joined).toHaveLength(0);
  });

  test('nguồn kết nối không tin cậy bị từ chối trước khi kiểm tra phiên', async () => {
    const { socket, joined, authenticate } = createGateway({ environment: 'production' });
    socket.handshake.headers.origin = 'http://trang-la.example';

    const error = await authenticate();

    expect((error as Error & { data: { code: string } }).data.code).toBe('auth/untrusted-origin');
    expect(joined).toHaveLength(0);
  });
});

describe('sessionCheckDelay', () => {
  const now = 1_000_000;

  test('kiểm tra lại đúng lúc phiên dự kiến hết hạn', () => {
    expect(sessionCheckDelay(now + 5 * 60_000, now)).toBe(5 * 60_000);
  });

  test('không chờ lâu hơn mức tối đa dù phiên còn rất lâu, và không có hạn thì dùng mức tối đa', () => {
    expect(sessionCheckDelay(now + 8 * 3600_000, now)).toBe(SESSION_CHECK_MAX_MS);
    expect(sessionCheckDelay(undefined, now)).toBe(SESSION_CHECK_MAX_MS);
  });

  test('đã hết hạn hoặc sắp hết thì vẫn chờ tối thiểu để không lặp sát nhau', () => {
    expect(sessionCheckDelay(now - 1000, now)).toBe(SESSION_CHECK_MIN_MS);
    expect(sessionCheckDelay(now + 1000, now)).toBe(SESSION_CHECK_MIN_MS);
  });
});

describe('EventsGateway.checkSession: kiểm tra lại phiên của kết nối đang mở', () => {
  type Resolve = () => Promise<{ actor: { userId: string }; expiresAt: Date } | null>;

  function createChecked(resolve: Resolve) {
    const gateway = new EventsGateway({ resolveWithExpiry: resolve } as never, {} as never, {} as never);
    const emitted: { event: string; payload: unknown }[] = [];
    const socket = {
      id: 'sock-1',
      connected: true,
      handshake: { headers: {} },
      data: { actor: { userId: 'u1' }, sessionExpiresAt: 0 as number | undefined },
      emit: (event: string, payload: unknown) => emitted.push({ event, payload }),
      disconnected: false,
      disconnect() {
        this.disconnected = true;
        this.connected = false;
      },
    };
    const timers = (gateway as unknown as { sessionTimers: Map<string, unknown> }).sessionTimers;
    const check = () => gateway.checkSession(socket as never);
    return { gateway, socket, emitted, timers, check };
  }

  test('phiên đã được gia hạn thì giữ kết nối, ghi hạn mới và hẹn kiểm tra tiếp', async () => {
    const renewed = new Date(Date.now() + 8 * 3600_000);
    const { socket, emitted, timers, check, gateway } = createChecked(() =>
      Promise.resolve({ actor: { userId: 'u1' }, expiresAt: renewed }),
    );

    await check();

    expect(socket.disconnected).toBe(false);
    expect(emitted).toHaveLength(0);
    expect(socket.data.sessionExpiresAt).toBe(renewed.getTime());
    expect(timers.size).toBe(1);
    gateway.handleDisconnect(socket as never);
    expect(timers.size).toBe(0);
  });

  test('phiên hết hạn hoặc bị xóa thì báo lý do rồi ngắt kết nối', async () => {
    const { socket, emitted, timers, check } = createChecked(() => Promise.resolve(null));

    await check();

    expect(emitted).toHaveLength(1);
    expect(emitted[0]!.event).toBe('authorization:error');
    expect(emitted[0]!.payload).toMatchObject({ code: 'auth/session-expired' });
    expect((emitted[0]!.payload as { message: string }).message).toContain('đăng nhập lại');
    expect(socket.disconnected).toBe(true);
    expect(timers.size).toBe(0);
  });

  test('phiên giờ thuộc tài khoản khác thì cũng ngắt', async () => {
    const { socket, check } = createChecked(() =>
      Promise.resolve({ actor: { userId: 'u2' }, expiresAt: new Date(Date.now() + 3600_000) }),
    );

    await check();

    expect(socket.disconnected).toBe(true);
  });

  test('lỗi tạm thời khi kiểm tra (DB chớp) thì không đuổi người dùng, hẹn thử lại', async () => {
    const { socket, emitted, timers, check, gateway } = createChecked(() => Promise.reject(new Error('db timeout')));

    await check();

    expect(socket.disconnected).toBe(false);
    expect(emitted).toHaveLength(0);
    expect(timers.size).toBe(1);
    gateway.handleDisconnect(socket as never);
  });

  test('kết nối đã đóng thì bỏ qua, không kiểm tra', async () => {
    let called = false;
    const { socket, check } = createChecked(() => {
      called = true;
      return Promise.resolve(null);
    });
    socket.connected = false;

    await check();

    expect(called).toBe(false);
  });
});
