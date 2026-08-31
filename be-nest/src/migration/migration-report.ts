export type MigrationMode = 'plan' | 'dry-run' | 'full' | 'resume' | 'verify';

export interface RejectedRow {
  table: string;
  key: string;
  message: string;
}

export interface TableResult {
  sourceCount: number;
  targetCount?: number;
  imported: number;
  rejected: number;
  sourceKeyHash?: string;
  targetKeyHash?: string;
}

export interface MigrationReport {
  mode: MigrationMode;
  startedAt: string;
  completedAt?: string;
  sourceDatabase?: string;
  targetDatabase?: string;
  sourceFingerprint?: string;
  timezoneDecision: string;
  tables: Record<string, TableResult>;
  blockers: string[];
  transformations: string[];
  rejectedRows: RejectedRow[];
  sequenceValues: Record<string, number>;
  timingsMs: Record<string, number>;
  verified: boolean;
}

export function createReport(mode: MigrationMode): MigrationReport {
  return {
    mode,
    startedAt: new Date().toISOString(),
    timezoneDecision:
      'Các giá trị datetime của SQL Server được đọc bằng driver mssql thành Date và ghi dưới dạng timestamptz UTC; giá trị gốc được giả định thuộc múi giờ Asia/Ho_Chi_Minh theo quyết định migration.',
    tables: {},
    blockers: [],
    transformations: [],
    rejectedRows: [],
    sequenceValues: {},
    timingsMs: {},
    verified: false,
  };
}
