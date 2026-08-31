import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { DATABASE } from '../database/database.constants.js';
import type { AppDatabase } from '../database/database.types.js';
import { halls } from '../database/schema/domain-schema.js';

@Injectable()
export class HallService {
  constructor(@Inject(DATABASE) private readonly database: AppDatabase) {}

  async list() {
    return this.database
      .select({ hallId: halls.id, hallName: halls.name })
      .from(halls)
      .orderBy(asc(halls.id));
  }

  async create(name: string) {
    const [existing] = await this.database
      .select({ id: halls.id })
      .from(halls)
      .where(sql`lower(${halls.name}) = ${name.toLowerCase()}`)
      .limit(1);
    if (existing) {
      throw new BadRequestException({ code: 'hall/already-exists', message: 'Hội trường đã tồn tại!' });
    }
    const [created] = await this.database.insert(halls).values({ name }).returning();
    return { hallId: created!.id, hallName: created!.name };
  }

  async update(id: number, name: string): Promise<boolean> {
    const rows = await this.database.update(halls).set({ name }).where(eq(halls.id, id)).returning();
    return rows.length > 0;
  }

  async delete(id: number): Promise<boolean> {
    try {
      const rows = await this.database.delete(halls).where(eq(halls.id, id)).returning();
      return rows.length > 0;
    } catch {
      return false;
    }
  }
}
