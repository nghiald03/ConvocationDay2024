import { pbkdf2, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const deriveKey = promisify(pbkdf2);

const algorithms: Record<number, 'sha1' | 'sha256' | 'sha512'> = {
  0: 'sha1',
  1: 'sha256',
  2: 'sha512',
};

export function isAspNetIdentityV3Hash(hash: string): boolean {
  try {
    const payload = Buffer.from(hash, 'base64');
    return payload.length >= 14 && payload[0] === 1;
  } catch {
    return false;
  }
}

export async function verifyAspNetIdentityV3Password(
  hash: string,
  password: string,
): Promise<boolean> {
  try {
    const payload = Buffer.from(hash, 'base64');
    if (payload.length < 14 || payload[0] !== 1) return false;

    const prf = payload.readUInt32BE(1);
    const iterations = payload.readUInt32BE(5);
    const saltLength = payload.readUInt32BE(9);
    const algorithm = algorithms[prf];
    if (!algorithm || iterations < 1 || saltLength < 16 || payload.length <= 13 + saltLength) {
      return false;
    }

    const salt = payload.subarray(13, 13 + saltLength);
    const expected = payload.subarray(13 + saltLength);
    const actual = await deriveKey(password, salt, iterations, expected.length, algorithm);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
