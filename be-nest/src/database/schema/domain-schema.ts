import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { authUser } from './auth-schema.js';

export const halls = pgTable(
  'hall',
  {
    id: integer('hall_id').primaryKey().generatedByDefaultAsIdentity(),
    name: varchar('hall_name', { length: 100 }).notNull(),
  },
  (table) => [uniqueIndex('hall_name_normalized_uidx').on(sql`lower(${table.name})`)],
);

export const sessions = pgTable(
  'session',
  {
    id: integer('session_id').primaryKey().generatedByDefaultAsIdentity(),
    sessionNumber: integer('session_number'),
    sessionInDay: integer('session_in_day'),
    description: text('description'),
  },
  (table) => [
    uniqueIndex('session_number_uidx')
      .on(table.sessionNumber)
      .where(sql`${table.sessionNumber} is not null`),
    index('session_in_day_idx').on(table.sessionInDay),
  ],
);

export const bachelors = pgTable(
  'bachelor',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    studentCode: varchar('student_code', { length: 20 }).notNull(),
    fullName: varchar('full_name', { length: 100 }).notNull(),
    mail: varchar('mail', { length: 100 }),
    faculty: varchar('faculty', { length: 50 }),
    major: varchar('major', { length: 50 }),
    image: varchar('image', { length: 250 }),
    status: boolean('status').default(false),
    bachelorStatus: varchar('bachelor_status', { length: 50 }),
    hallId: integer('hall_id').references(() => halls.id, { onDelete: 'restrict' }),
    sessionId: integer('session_id').references(() => sessions.id, { onDelete: 'restrict' }),
    chair: varchar('chair', { length: 50 }),
    chairParent: varchar('chair_parent', { length: 50 }),
    sessionInDay: integer('session_in_day'),
    checkIn: boolean('check_in'),
    timeCheckIn: timestamp('time_check_in', { withTimezone: true }),
    attendanceStatus: integer('attendance_status').notNull().default(0),
  },
  (table) => [
    uniqueIndex('bachelor_student_code_normalized_uidx').on(sql`lower(${table.studentCode})`),
    index('bachelor_hall_id_idx').on(table.hallId),
    index('bachelor_session_id_idx').on(table.sessionId),
    index('bachelor_hall_session_idx').on(table.hallId, table.sessionId),
    index('bachelor_check_in_idx').on(table.checkIn),
    check('bachelor_attendance_status_check', sql`${table.attendanceStatus} between 0 and 3`),
  ],
);

export const checkIns = pgTable(
  'check_in',
  {
    id: integer('checkin_id').primaryKey().generatedByDefaultAsIdentity(),
    hallId: integer('hall_id').references(() => halls.id, { onDelete: 'restrict' }),
    sessionId: integer('session_id').references(() => sessions.id, { onDelete: 'restrict' }),
    status: boolean('status'),
  },
  (table) => [
    index('check_in_hall_id_idx').on(table.hallId),
    index('check_in_session_id_idx').on(table.sessionId),
    uniqueIndex('check_in_hall_session_uidx').on(table.hallId, table.sessionId),
  ],
);

export const notifications = pgTable(
  'notification',
  {
    id: integer('notification_id').primaryKey().generatedByDefaultAsIdentity(),
    title: varchar('title', { length: 200 }).notNull(),
    content: varchar('content', { length: 1000 }).notNull(),
    priority: integer('priority').notNull().default(2),
    hallId: integer('hall_id').references(() => halls.id, { onDelete: 'set null' }),
    sessionId: integer('session_id').references(() => sessions.id, { onDelete: 'set null' }),
    createdBy: text('created_by')
      .notNull()
      .references(() => authUser.id, { onDelete: 'restrict' }),
    broadcastBy: text('broadcast_by').references(() => authUser.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    broadcastAt: timestamp('broadcast_at', { withTimezone: true }),
    status: varchar('status', { length: 20 }).notNull().default('PENDING'),
    isAutomatic: boolean('is_automatic').notNull().default(false),
    repeatCount: integer('repeat_count').notNull().default(1),
  },
  (table) => [
    index('notification_status_created_idx').on(table.status, table.createdAt),
    index('notification_scheduled_at_idx').on(table.scheduledAt),
    index('notification_hall_id_idx').on(table.hallId),
    index('notification_session_id_idx').on(table.sessionId),
    check('notification_priority_check', sql`${table.priority} between 1 and 3`),
    check('notification_repeat_count_check', sql`${table.repeatCount} between 1 and 10`),
    check(
      'notification_status_check',
      sql`${table.status} in ('PENDING', 'BROADCASTING', 'COMPLETED', 'CANCELLED')`,
    ),
  ],
);
