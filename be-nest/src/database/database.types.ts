import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema/schema.js';

export type AppDatabase = NodePgDatabase<typeof schema>;
