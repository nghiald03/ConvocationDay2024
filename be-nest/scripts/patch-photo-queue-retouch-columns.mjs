import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

try {
  await client.query(`
    alter table photo_queue_entry
      add column if not exists retouch_note_image_1 text,
      add column if not exists retouch_note_image_2 text;
  `);
  console.log('Photo queue retouch columns are ready.');
} finally {
  await client.end();
}
