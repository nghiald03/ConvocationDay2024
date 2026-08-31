import { createHash } from 'node:crypto';
import type { RejectedRow } from './migration-report.js';
import type { SourceRow } from './sql-server-source.js';

function scalarString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
  if (value instanceof Date) return value.toISOString();
  throw new Error('Giá trị nguồn không phải kiểu dữ liệu vô hướng được hỗ trợ.');
}

export function deterministicId(namespace: string, value: unknown): string {
  const hex = createHash('sha256').update(`${namespace}:${scalarString(value)}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function textValue(row: SourceRow, column: string, required = false): string | null {
  const value = row[column];
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    if (required) throw new Error(`Thiếu giá trị bắt buộc ở cột ${column}.`);
    return null;
  }
  return scalarString(value).trim();
}

export function numberValue(row: SourceRow, column: string, required = false): number | null {
  const value = row[column];
  if (value === null || value === undefined || value === '') {
    if (required) throw new Error(`Thiếu giá trị bắt buộc ở cột ${column}.`);
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Giá trị cột ${column} không phải là số hợp lệ.`);
  return parsed;
}

export function booleanValue(row: SourceRow, column: string): boolean | null {
  const value = row[column];
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || (typeof value === 'string' && value.toLowerCase() === 'true')) return true;
  if (value === 0 || value === '0' || (typeof value === 'string' && value.toLowerCase() === 'false')) return false;
  throw new Error(`Giá trị cột ${column} không phải boolean hợp lệ.`);
}

export function dateValue(row: SourceRow, column: string): Date | null {
  const value = row[column];
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(scalarString(value));
  if (Number.isNaN(date.getTime())) throw new Error(`Giá trị cột ${column} không phải ngày giờ hợp lệ.`);
  return date;
}

// SQL Server `datetime` in the legacy application was produced by GETDATE()/local
// application time and has no offset. The mssql driver exposes the wall-clock
// components as UTC when useUTC is enabled, so apply the fixed Vietnam UTC+07
// decision explicitly and independently of the machine running the migration.
export function legacyVietnamDateValue(row: SourceRow, column: string): Date | null {
  const value = dateValue(row, column);
  return value ? new Date(value.getTime() - 7 * 60 * 60 * 1000) : null;
}

export function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function rejectRow(table: string, row: SourceRow, error: unknown): RejectedRow {
  const candidate = row.Id ?? row.ID ?? row.UserId ?? row.HallId ?? row.SessionId ?? row.StudentCode;
  return {
    table,
    key: candidate === undefined ? '(không xác định)' : scalarString(candidate),
    message: error instanceof Error ? error.message : 'Dữ liệu nguồn không hợp lệ.',
  };
}

export function parseJsonDetails(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(scalarString(value));
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : { value: parsed };
  } catch {
    return { legacyText: scalarString(value) };
  }
}
