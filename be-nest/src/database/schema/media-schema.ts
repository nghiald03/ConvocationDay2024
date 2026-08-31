import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { authUser } from './auth-schema.js';

export const mediaAssets = pgTable(
  'media_asset',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    objectKey: varchar('object_key', { length: 512 }).notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    contentType: varchar('content_type', { length: 100 }).notNull(),
    size: bigint('size', { mode: 'number' }).notNull(),
    width: integer('width'),
    height: integer('height'),
    sha256: varchar('sha256', { length: 64 }).notNull(),
    ownerType: varchar('owner_type', { length: 50 }).notNull(),
    ownerId: varchar('owner_id', { length: 100 }).notNull(),
    status: integer('status').notNull().default(0),
    uploadedBy: text('uploaded_by')
      .notNull()
      .references(() => authUser.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('media_asset_object_key_uidx').on(table.objectKey),
    index('media_asset_sha256_idx').on(table.sha256),
    index('media_asset_owner_idx').on(table.ownerType, table.ownerId),
    index('media_asset_status_created_idx').on(table.status, table.createdAt),
    check('media_asset_status_check', sql`${table.status} between 0 and 2`),
    check('media_asset_size_check', sql`${table.size} >= 0`),
  ],
);

export const legacyMediaMappings = pgTable(
  'legacy_media_mapping',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    oldPath: text('old_path').notNull(),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'cascade' }),
    sha256: varchar('sha256', { length: 64 }).notNull(),
    migratedAt: timestamp('migrated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('legacy_media_mapping_old_path_uidx').on(table.oldPath),
    index('legacy_media_mapping_media_id_idx').on(table.mediaId),
    index('legacy_media_mapping_sha256_idx').on(table.sha256),
  ],
);
