import { asc, sql } from 'drizzle-orm';
import { bachelors } from '../database/schema/domain-schema.js';

/** Sắp xếp ghế tự nhiên: A02 trước A10, ghế số theo giá trị số, ghế sai định dạng xuống cuối. */
export const chairOrder = [
  sql`case when ${bachelors.chair} ~ '^[A-Za-z]*[0-9]+$' then 0 else 1 end`,
  sql`upper(substring(${bachelors.chair} from '^[A-Za-z]*'))`,
  sql`substring(${bachelors.chair} from '[0-9]+$')::numeric`,
  asc(bachelors.chair),
];
