import { boolean, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { authUser } from './auth-schema.js';

export const legacyIdentityCredentials = pgTable(
  'legacy_identity_credential',
  {
    legacyUserId: text('legacy_user_id').primaryKey(),
    authUserId: text('auth_user_id')
      .notNull()
      .references(() => authUser.id, { onDelete: 'cascade' }),
    aspNetPasswordHash: text('aspnet_password_hash'),
    passwordResetRequired: boolean('password_reset_required').notNull().default(false),
    migratedAt: timestamp('migrated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('legacy_identity_auth_user_id_idx').on(table.authUserId)],
);
