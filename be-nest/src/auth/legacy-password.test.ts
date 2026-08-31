import { describe, expect, test } from 'bun:test';
import { pbkdf2Sync } from 'node:crypto';
import { isAspNetIdentityV3Hash, verifyAspNetIdentityV3Password } from './legacy-password.js';

function aspNetIdentityV3Hash(password: string): string {
  const salt = Buffer.from('0123456789abcdef');
  const subkey = pbkdf2Sync(password, salt, 10_000, 32, 'sha256');
  const payload = Buffer.alloc(13 + salt.length + subkey.length);
  payload[0] = 1;
  payload.writeUInt32BE(1, 1);
  payload.writeUInt32BE(10_000, 5);
  payload.writeUInt32BE(salt.length, 9);
  salt.copy(payload, 13);
  subkey.copy(payload, 13 + salt.length);
  return payload.toString('base64');
}

describe('ASP.NET Identity V3 password migration', () => {
  test('xác minh đúng hash PBKDF2 và từ chối sai mật khẩu', async () => {
    const hash = aspNetIdentityV3Hash('Mat-khau-an-toan-123');
    expect(isAspNetIdentityV3Hash(hash)).toBe(true);
    expect(await verifyAspNetIdentityV3Password(hash, 'Mat-khau-an-toan-123')).toBe(true);
    expect(await verifyAspNetIdentityV3Password(hash, 'sai-mat-khau')).toBe(false);
  });

  test('từ chối payload hỏng mà không ném lỗi', async () => {
    expect(isAspNetIdentityV3Hash('khong-phai-hash')).toBe(false);
    expect(await verifyAspNetIdentityV3Password('khong-phai-hash', 'password')).toBe(false);
  });
});
