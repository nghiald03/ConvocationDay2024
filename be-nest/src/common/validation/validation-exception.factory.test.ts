import { describe, expect, test } from 'bun:test';
import { validationExceptionFactory } from './validation-exception.factory.js';

describe('lỗi validation tiếng Việt', () => {
  test('không trả thông báo class-validator tiếng Anh ra frontend', () => {
    const exception = validationExceptionFactory([
      { property: 'email', constraints: { isEmail: 'email must be an email' }, children: [] },
    ]);
    expect(exception.getResponse()).toEqual({
      code: 'request/validation-failed',
      message: 'Dữ liệu gửi lên không hợp lệ.',
      details: ['Trường email phải là địa chỉ email hợp lệ.'],
    });
  });
});
