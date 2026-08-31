import { pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import { authUser } from './auth-schema.js';

export const roles = pgTable('role', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
});

export const permissions = pgTable('permission', {
  name: text('name').primaryKey(),
  description: text('description'),
});

export const rolePermissions = pgTable(
  'role_permission',
  {
    roleCode: text('role_code')
      .notNull()
      .references(() => roles.code, { onDelete: 'cascade' }),
    permissionName: text('permission_name')
      .notNull()
      .references(() => permissions.name, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.roleCode, table.permissionName] })],
);

export const userRoles = pgTable(
  'user_role',
  {
    userId: text('user_id')
      .notNull()
      .references(() => authUser.id, { onDelete: 'cascade' }),
    roleCode: text('role_code')
      .notNull()
      .references(() => roles.code, { onDelete: 'restrict' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.roleCode] })],
);
