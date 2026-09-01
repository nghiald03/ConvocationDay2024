import { describe, expect, test } from 'bun:test';
import { inspectTextBuffer } from './encoding-check.mjs';

const utf8 = (value) => Buffer.from(value, 'utf8');

describe('encoding check', () => {
  test('rejects bytes that are not valid UTF-8', () => {
    expect(inspectTextBuffer('invalid.txt', Buffer.from([0xc3, 0x28]))).toEqual([
      expect.objectContaining({ kind: 'invalid-utf8' }),
    ]);
  });

  test('rejects replacement characters and common Vietnamese mojibake sequences', () => {
    const corrupted = [
      `Kh${String.fromCodePoint(0x00c3, 0x00b4)}ng`,
      `${String.fromCodePoint(0x00c4, 0x2018)}ã`,
      `${String.fromCodePoint(0x00c6, 0x00b0)}u`,
      `${String.fromCodePoint(0x00e1, 0x00bb)}›`,
      `${String.fromCodePoint(0x00e2, 0x20ac)}`,
      'Ký tự lỗi \ufffd',
    ].join('\n');

    expect(inspectTextBuffer('corrupted.txt', utf8(corrupted))).toHaveLength(6);
  });

  test('accepts valid Vietnamese, including words beginning with Â', () => {
    expect(inspectTextBuffer('valid.txt', utf8('Âm thanh mượt hơn hẳn.'))).toEqual([]);
  });
});
