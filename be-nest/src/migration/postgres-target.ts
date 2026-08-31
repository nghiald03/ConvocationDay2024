import { createHash } from 'node:crypto';
import { Pool } from 'pg';

export type TargetValue = string | number | boolean | Date | null | Record<string, unknown>;

export class PostgresTarget {
  readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 5, application_name: 'convocation-migration' });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async databaseName(): Promise<string> {
    return (await this.pool.query<{ name: string }>('select current_database() as name')).rows[0]?.name ?? '';
  }

  async tableExists(table: string): Promise<boolean> {
    const result = await this.pool.query<{ found: string }>(
      "select count(*) as found from information_schema.tables where table_schema = 'public' and table_name = $1",
      [table],
    );
    return Number(result.rows[0]?.found ?? 0) > 0;
  }

  async count(table: string): Promise<number> {
    this.assertIdentifier(table);
    const result = await this.pool.query<{ count: string }>(`select count(*) as count from "${table}"`);
    return Number(result.rows[0]?.count ?? 0);
  }

  async truncateForFullImport(): Promise<void> {
    await this.pool.query(`
      truncate table
        migration_checkpoint,
        legacy_media_mapping,
        media_asset,
        notification,
        bachelor,
        check_in,
        session,
        hall,
        audit_event,
        legacy_identity_credential,
        user_role,
        auth_verification,
        auth_session,
        auth_account,
        auth_user
      restart identity cascade
    `);
  }

  async insertRows(
    table: string,
    columns: string[],
    rows: TargetValue[][],
    conflictClause = 'on conflict do nothing',
  ): Promise<number> {
    if (!rows.length) return 0;
    this.assertIdentifier(table);
    columns.forEach((column) => this.assertIdentifier(column));
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const parameters: TargetValue[] = [];
      const tuples = rows.map((row) => {
        if (row.length !== columns.length) throw new Error(`Sai số cột khi import bảng ${table}.`);
        const placeholders = row.map((value) => {
          parameters.push(value);
          return `$${parameters.length}`;
        });
        return `(${placeholders.join(',')})`;
      });
      const result = await client.query(
        `insert into "${table}" (${columns.map((column) => `"${column}"`).join(',')}) values ${tuples.join(',')} ${conflictClause}`,
        parameters,
      );
      await client.query('commit');
      return result.rowCount ?? 0;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async checkpoint(phase: string, fingerprint: string, details: Record<string, unknown>): Promise<void> {
    await this.pool.query(
      `insert into migration_checkpoint (phase, source_fingerprint, details)
       values ($1, $2, $3)
       on conflict (phase) do update set source_fingerprint = excluded.source_fingerprint,
         details = excluded.details, completed_at = now()`,
      [phase, fingerprint, details],
    );
  }

  async completedPhases(fingerprint: string): Promise<Set<string>> {
    const result = await this.pool.query<{ phase: string }>(
      'select phase from migration_checkpoint where source_fingerprint = $1',
      [fingerprint],
    );
    return new Set(result.rows.map(({ phase }) => phase));
  }

  async keyHash(table: string, key: string, batchSize: number): Promise<string> {
    this.assertIdentifier(table);
    this.assertIdentifier(key);
    const hash = createHash('sha256');
    let offset = 0;
    while (true) {
      const result = await this.pool.query<Record<string, unknown>>(
        `select "${key}" from "${table}" order by "${key}" offset $1 limit $2`,
        [offset, batchSize],
      );
      for (const row of result.rows) hash.update(`${String(row[key])}\n`);
      if (result.rows.length < batchSize) break;
      offset += result.rows.length;
    }
    return hash.digest('hex');
  }

  async setSequences(): Promise<Record<string, number>> {
    const pairs = [
      ['hall', 'hall_id'],
      ['session', 'session_id'],
      ['bachelor', 'id'],
      ['check_in', 'checkin_id'],
      ['notification', 'notification_id'],
      ['media_asset', 'id'],
      ['legacy_media_mapping', 'id'],
      ['audit_event', 'id'],
    ] as const;
    const values: Record<string, number> = {};
    for (const [table, column] of pairs) {
      if (table === 'media_asset') continue;
      const result = await this.pool.query<{ next_value: number }>(
        `select coalesce(max("${column}"), 0)::bigint + 1 as next_value from "${table}"`,
      );
      const next = Number(result.rows[0]?.next_value ?? 1);
      await this.pool.query(
        `select setval(pg_get_serial_sequence('${table}', '${column}'), $1, false)`,
        [next],
      );
      values[`${table}.${column}`] = next;
    }
    return values;
  }

  async analyze(): Promise<void> {
    await this.pool.query('analyze');
  }

  async foreignKeyViolations(): Promise<Array<Record<string, unknown>>> {
    const checks = [
      `select 'bachelor.hall_id' as relation, b.id::text as key from bachelor b left join hall h on h.hall_id = b.hall_id where b.hall_id is not null and h.hall_id is null`,
      `select 'bachelor.session_id' as relation, b.id::text as key from bachelor b left join session s on s.session_id = b.session_id where b.session_id is not null and s.session_id is null`,
      `select 'notification.created_by' as relation, n.notification_id::text as key from notification n left join auth_user u on u.id = n.created_by where u.id is null`,
      `select 'user_role.user_id' as relation, ur.user_id as key from user_role ur left join auth_user u on u.id = ur.user_id where u.id is null`,
    ];
    const violations: Array<Record<string, unknown>> = [];
    for (const query of checks) violations.push(...(await this.pool.query<Record<string, unknown>>(query)).rows);
    return violations;
  }

  private assertIdentifier(value: string): void {
    if (!/^[a-z][a-z0-9_]*$/.test(value)) throw new Error(`Tên định danh PostgreSQL không hợp lệ: ${value}`);
  }
}
