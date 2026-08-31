import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const migrationCheckpoints = pgTable('migration_checkpoint', {
  phase: text('phase').primaryKey(),
  sourceFingerprint: text('source_fingerprint').notNull(),
  details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
  completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
});
