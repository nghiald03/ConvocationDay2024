import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

const CONSTRAINT_MESSAGES: Record<string, string> = {
  isDefined: 'là trường bắt buộc',
  isNotEmpty: 'không được để trống',
  isString: 'phải là chuỗi',
  isEmail: 'phải là địa chỉ email hợp lệ',
  isInt: 'phải là số nguyên',
  isNumber: 'phải là số hợp lệ',
  isBoolean: 'phải là giá trị đúng hoặc sai',
  isArray: 'phải là danh sách',
  isEnum: 'có giá trị không được hỗ trợ',
  isUUID: 'phải là UUID hợp lệ',
  isDateString: 'phải là ngày giờ hợp lệ',
  min: 'nhỏ hơn giá trị tối thiểu',
  max: 'lớn hơn giá trị tối đa',
  minLength: 'quá ngắn',
  maxLength: 'quá dài',
  arrayMinSize: 'không có đủ phần tử',
  arrayMaxSize: 'có quá nhiều phần tử',
  whitelistValidation: 'không được phép xuất hiện trong yêu cầu',
};

function flatten(errors: ValidationError[], prefix = ''): string[] {
  return errors.flatMap((error) => {
    const field = prefix ? `${prefix}.${error.property}` : error.property;
    const own = Object.keys(error.constraints ?? {}).map(
      (constraint) => `Trường ${field} ${CONSTRAINT_MESSAGES[constraint] ?? 'không hợp lệ'}.`,
    );
    return [...own, ...flatten(error.children ?? [], field)];
  });
}

export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
  return new BadRequestException({
    code: 'request/validation-failed',
    message: 'Dữ liệu gửi lên không hợp lệ.',
    details: flatten(errors),
  });
}
