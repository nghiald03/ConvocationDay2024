import sql from 'mssql';
import { createHash } from 'node:crypto';

export type SourceRow = Record<string, unknown>;

export class SqlServerSource {
  private readonly pool: sql.ConnectionPool;

  constructor(connectionString: string) {
    this.pool = new sql.ConnectionPool(connectionString);
  }

  async connect(): Promise<void> {
    await this.pool.connect();
  }

  async close(): Promise<void> {
    await this.pool.close();
  }

  async databaseName(): Promise<string> {
    const result = await this.pool.request().query<{ name: string }>('select db_name() as name');
    return result.recordset[0]?.name ?? '';
  }

  async tableExists(table: string): Promise<boolean> {
    const result = await this.pool
      .request()
      .input('table', sql.NVarChar, table)
      .query<{ found: number }>(
        "select count(*) as found from information_schema.tables where table_schema = 'dbo' and table_name = @table",
      );
    return (result.recordset[0]?.found ?? 0) > 0;
  }

  async count(table: string): Promise<number> {
    this.assertIdentifier(table);
    const result = await this.pool.request().query<{ count: number }>(`select count(*) as count from [dbo].[${table}]`);
    return result.recordset[0]?.count ?? 0;
  }

  async rows(table: string, orderColumn: string, offset: number, limit: number): Promise<SourceRow[]> {
    this.assertIdentifier(table);
    this.assertIdentifier(orderColumn);
    const result = await this.pool
      .request()
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query<SourceRow>(
        `select * from [dbo].[${table}] order by [${orderColumn}] offset @offset rows fetch next @limit rows only`,
      );
    return result.recordset;
  }

  async query(query: string): Promise<SourceRow[]> {
    return (await this.pool.request().query<SourceRow>(query)).recordset;
  }

  async keyHash(table: string, key: string, batchSize: number): Promise<string> {
    const hash = createHash('sha256');
    let offset = 0;
    while (true) {
      const rows = await this.rows(table, key, offset, batchSize);
      for (const row of rows) hash.update(`${String(row[key])}\n`);
      if (rows.length < batchSize) break;
      offset += rows.length;
    }
    return hash.digest('hex');
  }

  private assertIdentifier(value: string): void {
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(value)) {
      throw new Error(`Tên định danh SQL Server không hợp lệ: ${value}`);
    }
  }
}
