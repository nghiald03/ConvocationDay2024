import { createHash } from 'node:crypto';
import type { MigrationMode, MigrationReport } from './migration-report.js';
import { createReport } from './migration-report.js';
import { PostgresTarget, type TargetValue } from './postgres-target.js';
import { SqlServerSource, type SourceRow } from './sql-server-source.js';
import {
  booleanValue,
  dateValue,
  deterministicId,
  legacyVietnamDateValue,
  numberValue,
  parseJsonDetails,
  rejectRow,
  textValue,
  validEmail,
} from './migration-transform.js';

interface TableMapping {
  source: string;
  target: string;
  key: string;
  targetKey: string;
  columns: string[];
  transform: (row: SourceRow, context: MigrationContext) => TargetValue[];
}

interface MigrationContext {
  userIds: Map<string, string>;
  legacyUsers: Map<string, SourceRow>;
}

export interface MigrationOptions {
  mode: MigrationMode;
  sourceUrl: string;
  targetUrl: string;
  expectedTarget?: string;
  batchSize: number;
}

export class MigrationRunner {
  private readonly source: SqlServerSource;
  private readonly target: PostgresTarget;
  private readonly report: MigrationReport;
  private readonly context: MigrationContext = { userIds: new Map(), legacyUsers: new Map() };
  private fingerprint = '';

  constructor(private readonly options: MigrationOptions) {
    this.source = new SqlServerSource(options.sourceUrl);
    this.target = new PostgresTarget(options.targetUrl);
    this.report = createReport(options.mode);
  }

  async run(): Promise<MigrationReport> {
    const started = Date.now();
    try {
      await this.source.connect();
      this.report.sourceDatabase = await this.source.databaseName();
      this.report.targetDatabase = await this.target.databaseName();
      this.fingerprint = await this.createSourceFingerprint();
      this.report.sourceFingerprint = this.fingerprint;
      await this.inspectPrerequisites();
      if (this.options.mode === 'plan') return this.finish(started, this.report.blockers.length === 0);
      await this.loadUserContext();
      if (this.options.mode === 'dry-run') {
        await this.processAll(false, new Set());
        return this.finish(started, this.report.blockers.length === 0 && this.report.rejectedRows.length === 0);
      }
      if (this.options.mode === 'full') {
        this.assertSafeFullTarget();
        await this.target.truncateForFullImport();
      }
      const completed = this.options.mode === 'resume' ? await this.target.completedPhases(this.fingerprint) : new Set<string>();
      if (this.options.mode !== 'verify') {
        await this.processAll(true, completed);
        if (this.report.rejectedRows.length > 0) {
          this.report.blockers.push('Có dòng dữ liệu bị từ chối; không thể xác nhận migration hoàn tất.');
        }
        this.report.sequenceValues = await this.target.setSequences();
        await this.target.analyze();
      }
      await this.verify();
      return this.finish(started, this.report.blockers.length === 0 && this.report.rejectedRows.length === 0);
    } catch (error) {
      this.report.blockers.push(error instanceof Error ? error.message : 'Migration thất bại do lỗi không xác định.');
      return this.finish(started, false);
    } finally {
      await Promise.allSettled([this.source.close(), this.target.close()]);
    }
  }

  private mappings(): TableMapping[] {
    return [
      { source: 'Hall', target: 'hall', key: 'HallId', targetKey: 'hall_id', columns: ['hall_id', 'hall_name'], transform: (r) => [numberValue(r, 'HallId', true)!, textValue(r, 'HallName', true)!] },
      { source: 'Session', target: 'session', key: 'SessionId', targetKey: 'session_id', columns: ['session_id', 'session_number', 'session_in_day', 'description'], transform: (r) => [numberValue(r, 'SessionId', true)!, numberValue(r, 'Session'), numberValue(r, 'SessionInDay'), textValue(r, 'Description')] },
      { source: 'CheckIn', target: 'check_in', key: 'CheckinID', targetKey: 'checkin_id', columns: ['checkin_id', 'hall_id', 'session_id', 'status'], transform: (r) => [numberValue(r, 'CheckinID', true)!, numberValue(r, 'HallId'), numberValue(r, 'SessionId'), booleanValue(r, 'Status')] },
      { source: 'Bachelor', target: 'bachelor', key: 'Id', targetKey: 'id', columns: ['id', 'student_code', 'full_name', 'mail', 'faculty', 'major', 'image', 'status', 'bachelor_status', 'hall_id', 'session_id', 'chair', 'chair_parent', 'session_in_day', 'check_in', 'time_check_in', 'attendance_status'], transform: (r) => [numberValue(r, 'Id', true)!, textValue(r, 'StudentCode', true)!, textValue(r, 'FullName', true)!, textValue(r, 'Mail'), textValue(r, 'Faculty'), textValue(r, 'Major'), textValue(r, 'Image'), booleanValue(r, 'Status'), textValue(r, 'StatusBaChelor'), numberValue(r, 'HallId'), numberValue(r, 'SessionId'), textValue(r, 'Chair'), textValue(r, 'ChairParent'), numberValue(r, 'SessionInDay'), booleanValue(r, 'CheckIn'), legacyVietnamDateValue(r, 'TimeCheckIn'), numberValue(r, 'AttendanceStatus') ?? 0] },
      { source: 'Notification', target: 'notification', key: 'NotificationId', targetKey: 'notification_id', columns: ['notification_id', 'title', 'content', 'priority', 'hall_id', 'session_id', 'created_by', 'broadcast_by', 'created_at', 'scheduled_at', 'broadcast_at', 'status', 'is_automatic', 'repeat_count'], transform: (r, c) => [numberValue(r, 'NotificationId', true)!, textValue(r, 'Title', true)!, textValue(r, 'Content', true)!, numberValue(r, 'Priority') ?? 2, numberValue(r, 'HallId'), numberValue(r, 'SessionId'), this.resolveUser(textValue(r, 'CreatedBy', true)!, c), this.resolveOptionalUser(textValue(r, 'BroadcastBy'), c), legacyVietnamDateValue(r, 'CreatedAt') ?? new Date(0), legacyVietnamDateValue(r, 'ScheduledAt'), legacyVietnamDateValue(r, 'BroadcastAt'), textValue(r, 'Status') ?? 'PENDING', booleanValue(r, 'IsAutomatic') ?? false, numberValue(r, 'RepeatCount') ?? 1] },
      { source: 'MediaAssets', target: 'media_asset', key: 'Id', targetKey: 'id', columns: ['id', 'object_key', 'original_name', 'content_type', 'size', 'width', 'height', 'sha256', 'owner_type', 'owner_id', 'status', 'uploaded_by', 'created_at', 'deleted_at'], transform: (r, c) => [textValue(r, 'Id', true)!, textValue(r, 'ObjectKey', true)!, textValue(r, 'OriginalName', true)!, textValue(r, 'ContentType', true)!, numberValue(r, 'Size', true)!, numberValue(r, 'Width'), numberValue(r, 'Height'), textValue(r, 'Sha256', true)!, textValue(r, 'OwnerType', true)!, textValue(r, 'OwnerId', true)!, numberValue(r, 'Status') ?? 0, this.resolveUser(textValue(r, 'UploadedBy', true)!, c), dateValue(r, 'CreatedAt') ?? new Date(0), dateValue(r, 'DeletedAt')] },
      { source: 'LegacyMediaMappings', target: 'legacy_media_mapping', key: 'Id', targetKey: 'id', columns: ['id', 'old_path', 'media_id', 'sha256', 'migrated_at'], transform: (r) => [numberValue(r, 'Id', true)!, textValue(r, 'OldPath', true)!, textValue(r, 'MediaId', true)!, textValue(r, 'Sha256', true)!, dateValue(r, 'MigratedAt') ?? new Date(0)] },
      { source: 'AuditEvents', target: 'audit_event', key: 'Id', targetKey: 'id', columns: ['id', 'event_id', 'action', 'actor_id', 'target_type', 'target_id', 'details', 'created_at'], transform: (r) => [numberValue(r, 'Id', true)!, deterministicId('audit-event', r.Id), textValue(r, 'Action', true)!, textValue(r, 'ActorId', true)!, textValue(r, 'TargetType', true)!, textValue(r, 'TargetId', true)!, parseJsonDetails(r.Details), dateValue(r, 'CreatedAt') ?? new Date(0)] },
    ];
  }

  private async processAll(write: boolean, completed: Set<string>): Promise<void> {
    await this.processIdentities(write, completed);
    for (const mapping of this.mappings()) {
      if (!(await this.source.tableExists(mapping.source))) continue;
      if (completed.has(mapping.target)) continue;
      const started = Date.now();
      let offset = 0;
      let imported = 0;
      let rejected = 0;
      const sourceCount = await this.source.count(mapping.source);
      while (offset < sourceCount) {
        const sourceRows = await this.source.rows(mapping.source, mapping.key, offset, this.options.batchSize);
        const targetRows: TargetValue[][] = [];
        for (const row of sourceRows) {
          try { targetRows.push(mapping.transform(row, this.context)); }
          catch (error) { this.report.rejectedRows.push(rejectRow(mapping.source, row, error)); rejected += 1; }
        }
        if (write) imported += await this.target.insertRows(mapping.target, mapping.columns, targetRows);
        else imported += targetRows.length;
        offset += sourceRows.length;
        if (sourceRows.length === 0) break;
      }
      this.report.tables[mapping.target] = { sourceCount, imported, rejected };
      this.report.timingsMs[mapping.target] = Date.now() - started;
      if (write) await this.target.checkpoint(mapping.target, this.fingerprint, { sourceCount, imported, rejected });
    }
  }

  private async loadUserContext(): Promise<void> {
    if (await this.source.tableExists('LegacyUsers')) {
      for (const row of await this.readAll('LegacyUsers', 'UserId')) {
        const id = textValue(row, 'UserId', true)!;
        this.context.legacyUsers.set(id, row);
      }
    }
    if (await this.source.tableExists('AspNetUsers')) {
      for (const row of await this.readAll('AspNetUsers', 'Id')) {
        const authId = deterministicId('auth-user', row.Id);
        this.context.userIds.set(String(row.Id), authId);
        const legacyId = textValue(row, 'LegacyUserId');
        if (legacyId) this.context.userIds.set(legacyId, authId);
      }
    }
    for (const legacyId of this.context.legacyUsers.keys()) {
      if (!this.context.userIds.has(legacyId)) this.context.userIds.set(legacyId, deterministicId('legacy-user', legacyId));
    }
  }

  private async processIdentities(write: boolean, completed: Set<string>): Promise<void> {
    if (completed.has('identities')) return;
    const aspRows = (await this.source.tableExists('AspNetUsers')) ? await this.readAll('AspNetUsers', 'Id') : [];
    const emailOwners = new Map<string, string>();
    const users: TargetValue[][] = [];
    const accounts: TargetValue[][] = [];
    const credentials: TargetValue[][] = [];
    const userRoles: TargetValue[][] = [];
    const aspRoleMap = await this.aspNetRoleMap();

    for (const row of aspRows) {
      try {
        const sourceId = textValue(row, 'Id', true)!;
        const id = this.context.userIds.get(sourceId)!;
        const email = (textValue(row, 'Email', true) ?? '').toLowerCase();
        this.assertEmailUnique(email, sourceId, emailOwners);
        const legacyId = textValue(row, 'LegacyUserId');
        const reset = booleanValue(row, 'PasswordResetRequired') ?? !textValue(row, 'PasswordHash');
        const createdAt = dateValue(row, 'CreatedAt') ?? new Date(0);
        users.push([id, textValue(row, 'FullName') ?? email, email, booleanValue(row, 'EmailConfirmed') ?? false, legacyId, false, reset, createdAt, createdAt]);
        const hash = textValue(row, 'PasswordHash');
        accounts.push([deterministicId('auth-account', sourceId), sourceId, 'credential', 'local:credential', id, hash, createdAt, createdAt]);
        credentials.push([sourceId, id, hash, reset, null, createdAt]);
        for (const role of aspRoleMap.get(sourceId) ?? []) userRoles.push([id, role, createdAt]);
      } catch (error) { this.report.rejectedRows.push(rejectRow('AspNetUsers', row, error)); }
    }
    for (const [legacyId, row] of this.context.legacyUsers) {
      if (aspRows.some((candidate) => textValue(candidate, 'LegacyUserId') === legacyId)) continue;
      try {
        const id = this.context.userIds.get(legacyId)!;
        const email = (textValue(row, 'Email', true) ?? '').toLowerCase();
        this.assertEmailUnique(email, legacyId, emailOwners);
        users.push([id, textValue(row, 'FullName') ?? email, email, false, legacyId, false, true, new Date(0), new Date(0)]);
        credentials.push([legacyId, id, null, true, null, new Date(0)]);
        const role = textValue(row, 'RoleId');
        if (role) userRoles.push([id, role, new Date(0)]);
      } catch (error) { this.report.rejectedRows.push(rejectRow('LegacyUsers', row, error)); }
    }
    if (write) {
      await this.target.insertRows('auth_user', ['id', 'name', 'email', 'email_verified', 'legacy_user_id', 'disabled', 'password_reset_required', 'created_at', 'updated_at'], users);
      await this.target.insertRows('auth_account', ['id', 'account_id', 'provider_id', 'issuer', 'user_id', 'password', 'created_at', 'updated_at'], accounts);
      await this.target.insertRows('legacy_identity_credential', ['legacy_user_id', 'auth_user_id', 'aspnet_password_hash', 'password_reset_required', 'migrated_at', 'created_at'], credentials);
      await this.target.insertRows('user_role', ['user_id', 'role_code', 'assigned_at'], userRoles);
      await this.target.checkpoint('identities', this.fingerprint, { users: users.length, accounts: accounts.length, roles: userRoles.length });
    }
    this.report.tables.identities = { sourceCount: aspRows.length + this.context.legacyUsers.size, imported: users.length, rejected: this.report.rejectedRows.filter(({ table }) => table === 'AspNetUsers' || table === 'LegacyUsers').length };
  }

  private async aspNetRoleMap(): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (!(await this.source.tableExists('AspNetUserRoles')) || !(await this.source.tableExists('AspNetRoles'))) return map;
    const rows = await this.source.query('select ur.UserId, r.Name as RoleCode from dbo.AspNetUserRoles ur join dbo.AspNetRoles r on r.Id = ur.RoleId order by ur.UserId, r.Name');
    for (const row of rows) {
      const userId = String(row.UserId);
      const role = String(row.RoleCode).toUpperCase();
      if (!['MN', 'CK', 'MC', 'US', 'NO'].includes(role)) {
        this.report.blockers.push(`Vai trò nguồn không được hỗ trợ: ${role}.`);
        continue;
      }
      map.set(userId, [...(map.get(userId) ?? []), role]);
    }
    return map;
  }

  private async verify(): Promise<void> {
    for (const mapping of this.mappings()) {
      if (!(await this.source.tableExists(mapping.source)) || !(await this.target.tableExists(mapping.target))) continue;
      const sourceCount = await this.source.count(mapping.source);
      const targetCount = await this.target.count(mapping.target);
      const sourceKeyHash = await this.source.keyHash(mapping.source, mapping.key, this.options.batchSize);
      const targetKeyHash = await this.target.keyHash(mapping.target, mapping.targetKey, this.options.batchSize);
      this.report.tables[mapping.target] = { ...(this.report.tables[mapping.target] ?? { imported: 0, rejected: 0 }), sourceCount, targetCount, sourceKeyHash, targetKeyHash };
      if (sourceCount !== targetCount) this.report.blockers.push(`Số dòng ${mapping.source}/${mapping.target} không khớp: ${sourceCount}/${targetCount}.`);
      if (sourceKeyHash !== targetKeyHash) this.report.blockers.push(`Tập khóa ${mapping.source}/${mapping.target} không khớp.`);
    }
    const violations = await this.target.foreignKeyViolations();
    if (violations.length > 0) this.report.blockers.push(`PostgreSQL còn ${violations.length} vi phạm khóa ngoại.`);
  }

  private async inspectPrerequisites(): Promise<void> {
    for (const table of ['Hall', 'Session', 'Bachelor', 'CheckIn']) if (!(await this.source.tableExists(table))) this.report.blockers.push(`SQL Server thiếu bảng bắt buộc dbo.${table}.`);
    for (const table of ['hall', 'session', 'bachelor', 'check_in', 'auth_user']) if (!(await this.target.tableExists(table))) this.report.blockers.push(`PostgreSQL thiếu bảng bắt buộc public.${table}; hãy chạy Drizzle migrations trước.`);
  }

  private assertSafeFullTarget(): void {
    const actual = this.report.targetDatabase ?? '';
    if (!this.options.expectedTarget || actual !== this.options.expectedTarget) throw new Error(`Tên PostgreSQL đích không khớp. Cần truyền --target=${actual} và MIGRATION_TARGET_NAME trùng khớp.`);
    if (!/(dev|test|staging|migration|rehearsal)/i.test(actual)) throw new Error('Lệnh full chỉ được phép xóa dữ liệu trên database non-production có tên rõ ràng.');
  }

  private async createSourceFingerprint(): Promise<string> {
    const hash = createHash('sha256');
    hash.update(this.report.sourceDatabase ?? '');
    for (const table of ['Hall', 'Session', 'Bachelor', 'CheckIn', 'AspNetUsers', 'Notification', 'MediaAssets']) {
      if (await this.source.tableExists(table)) hash.update(`${table}:${await this.source.count(table)};`);
    }
    return hash.digest('hex');
  }

  private async readAll(table: string, key: string): Promise<SourceRow[]> {
    const count = await this.source.count(table);
    const result: SourceRow[] = [];
    for (let offset = 0; offset < count; offset += this.options.batchSize) result.push(...await this.source.rows(table, key, offset, this.options.batchSize));
    return result;
  }

  private resolveUser(sourceId: string, context: MigrationContext): string {
    const id = context.userIds.get(sourceId);
    if (!id) throw new Error(`Không ánh xạ được người dùng ${sourceId}.`);
    return id;
  }

  private resolveOptionalUser(sourceId: string | null, context: MigrationContext): string | null {
    return sourceId ? this.resolveUser(sourceId, context) : null;
  }

  private assertEmailUnique(email: string, userId: string, owners: Map<string, string>): void {
    if (!validEmail(email)) throw new Error(`Email không hợp lệ: ${email}.`);
    const owner = owners.get(email);
    if (owner && owner !== userId) throw new Error(`Email bị trùng không phân biệt hoa thường: ${email}.`);
    owners.set(email, userId);
  }

  private finish(started: number, verified: boolean): MigrationReport {
    this.report.completedAt = new Date().toISOString();
    this.report.timingsMs.total = Date.now() - started;
    this.report.verified = verified;
    return this.report;
  }
}
