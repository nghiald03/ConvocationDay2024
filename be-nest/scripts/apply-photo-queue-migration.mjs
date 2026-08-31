import { readFile } from 'node:fs/promises';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');

const migrationSql = await readFile(new URL('../drizzle/0002_photo_queue.sql', import.meta.url), 'utf8');
const statements = migrationSql
  .split('--> statement-breakpoint')
  .map((statement) => statement.trim())
  .filter(Boolean);

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

try {
  await client.query('begin');
  for (const statement of statements) {
    await client.query(statement);
  }
  await client.query(`
    create schema if not exists drizzle;
    create table if not exists drizzle.__drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at bigint
    );
  `);
  await client.query(
    'insert into drizzle.__drizzle_migrations (hash, created_at) values ($1, $2)',
    ['0002_photo_queue', Date.now()],
  );
  await client.query('commit');
  console.log(`Applied ${statements.length} photo queue migration statements.`);
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  await client.end();
}
