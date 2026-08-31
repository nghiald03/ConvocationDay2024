import { bigint, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const auditEvents = pgTable(
  'audit_event',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    eventId: uuid('event_id').notNull().defaultRandom(),
    action: text('action').notNull(),
    actorId: text('actor_id').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    details: jsonb('details').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_event_actor_created_idx').on(table.actorId, table.createdAt),
    index('audit_event_target_idx').on(table.targetType, table.targetId),
  ],
);
