import { describe, expect, test } from 'bun:test';
import type { ConfigService } from '@nestjs/config';
import {
  FORCE_CODE_ALPHABET,
  FORCE_CODE_MAX_FAILURES,
  FORCE_CODE_WINDOW_MS,
  ForceCheckInCodeService,
} from './force-check-in-code.service.js';

function createService(startMs = 10 * FORCE_CODE_WINDOW_MS, secret = 'test-secret') {
  let now = startMs;
  const config = { getOrThrow: () => secret } as unknown as ConfigService;
  const service = new ForceCheckInCodeService(config);
  service.clock = () => now;
  return {
    service,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

function errorOf(run: () => void): { status: number | undefined; message: string | undefined } | null {
  try {
    run();
    return null;
  } catch (error) {
    const value = error as { getStatus?: () => number; message?: string };
    return { status: value.getStatus?.(), message: value.message };
  }
}

describe('ForceCheckInCodeService', () => {
  test('mã gồm 4 ký tự chữ in hoa và số, không có ký tự dễ nhầm', () => {
    const { service, advance } = createService();
    for (let index = 0; index < 50; index += 1) {
      const { code } = service.current();
      expect(code).toMatch(/^[A-Z2-9]{4}$/);
      for (const character of code) expect(FORCE_CODE_ALPHABET).toContain(character);
      expect(code).not.toMatch(/[IO01]/);
      advance(FORCE_CODE_WINDOW_MS);
    }
  });

  test('giữ nguyên trong 5 phút và đổi khi sang khung mới', () => {
    const { service, advance } = createService();
    const first = service.current();
    advance(FORCE_CODE_WINDOW_MS - 1);
    expect(service.current().code).toBe(first.code);
    expect(service.current().expiresInMs).toBe(1);
    advance(1);
    const codes = new Set([first.code]);
    for (let index = 0; index < 5; index += 1) {
      codes.add(service.current().code);
      advance(FORCE_CODE_WINDOW_MS);
    }
    expect(codes.size).toBeGreaterThan(1);
  });

  test('khóa bí mật khác cho mã khác', () => {
    const codes = new Set(
      ['a', 'b', 'c', 'd', 'e'].map((secret) => createService(undefined, secret).service.current().code),
    );
    expect(codes.size).toBeGreaterThan(1);
  });

  test('nhận mã hiện tại, không phân biệt hoa thường và khoảng trắng', () => {
    const { service } = createService();
    const { code } = service.current();
    expect(errorOf(() => service.assertValid('user-1', ` ${code.toLowerCase()} `))).toBeNull();
  });

  test('vẫn nhận mã của 5 phút trước nhưng không nhận mã cũ hơn', () => {
    const { service, advance } = createService();
    const { code } = service.current();
    advance(FORCE_CODE_WINDOW_MS);
    expect(errorOf(() => service.assertValid('user-1', code))).toBeNull();
    advance(FORCE_CODE_WINDOW_MS);
    if (service.current().code !== code) {
      expect(errorOf(() => service.assertValid('user-1', code))?.status).toBe(400);
    }
  });

  test('sai 5 lần thì khóa 5 phút kể cả khi nhập đúng, sau đó mở lại', () => {
    const { service, advance } = createService();
    for (let attempt = 1; attempt <= FORCE_CODE_MAX_FAILURES; attempt += 1) {
      expect(errorOf(() => service.assertValid('user-1', '!!!!'))?.status).toBe(400);
    }
    expect(errorOf(() => service.assertValid('user-1', service.current().code))?.status).toBe(429);
    expect(errorOf(() => service.assertValid('user-2', service.current().code))).toBeNull();
    advance(FORCE_CODE_WINDOW_MS);
    expect(errorOf(() => service.assertValid('user-1', service.current().code))).toBeNull();
  });

  test('nhập đúng thì xóa số lần sai trước đó', () => {
    const { service } = createService();
    for (let attempt = 1; attempt < FORCE_CODE_MAX_FAILURES; attempt += 1) {
      errorOf(() => service.assertValid('user-1', '!!!!'));
    }
    expect(errorOf(() => service.assertValid('user-1', service.current().code))).toBeNull();
    expect(errorOf(() => service.assertValid('user-1', '!!!!'))?.status).toBe(400);
    expect(errorOf(() => service.assertValid('user-1', service.current().code))).toBeNull();
  });
});

describe('ForceCheckInCodeService.requireFor', () => {
  const ck = { userId: 'ck-1', roles: ['CK'] };

  test('CL và MN không cần nhập mã', () => {
    const { service } = createService();
    expect(errorOf(() => service.requireFor({ userId: 'cl', roles: ['CL'] }, undefined, 'Chuyển ca'))).toBeNull();
    expect(errorOf(() => service.requireFor({ userId: 'mn', roles: ['mn'] }, '', 'Chuyển ca'))).toBeNull();
  });

  test('nhân viên check-in thiếu mã thì bị chặn, sai mã thì bị chặn, đúng mã thì qua', () => {
    const { service } = createService();
    expect(errorOf(() => service.requireFor(ck, undefined, 'Chuyển ca'))?.message).toContain('cần mã khẩn cấp');
    expect(errorOf(() => service.requireFor(ck, '  ', 'Chuyển ca'))?.message).toContain('cần mã khẩn cấp');
    expect(errorOf(() => service.requireFor(ck, 'ZZZZ' === service.current().code ? 'YYYY' : 'ZZZZ', 'Chuyển ca'))).not.toBeNull();
    expect(errorOf(() => service.requireFor(ck, service.current().code.toLowerCase(), 'Chuyển ca'))).toBeNull();
  });
});
