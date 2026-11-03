import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { hashPassword } from 'better-auth/crypto';
import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm';
import { DATABASE } from '../database/database.constants.js';
import type { AppDatabase } from '../database/database.types.js';
import { authAccount, authSession, authUser } from '../database/schema/auth-schema.js';
import { roles, userCheckinRooms, userRoles } from '../database/schema/authorization-schema.js';

const MANAGER_ROLE = 'MN';

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  roles: string[];
  checkinRooms: string[];
  disabled: boolean;
  lockedUntil: Date | null;
  createdAt: Date;
}

type Transaction = Parameters<Parameters<AppDatabase['transaction']>[0]>[0];

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE) private readonly database: AppDatabase) {}

  async listRoles() {
    return this.database.select({ code: roles.code, name: roles.name }).from(roles).orderBy(asc(roles.code));
  }

  async list(): Promise<UserSummary[]> {
    const rows = await this.database
      .select({
        id: authUser.id,
        email: authUser.email,
        name: authUser.name,
        disabled: authUser.disabled,
        lockoutEnd: authUser.lockoutEnd,
        createdAt: authUser.createdAt,
        roles: sql<string[]>`coalesce(array_agg(${userRoles.roleCode} order by ${userRoles.roleCode}) filter (where ${userRoles.roleCode} is not null), '{}')`,
        checkinRooms: sql<string[]>`coalesce((select array_agg(${userCheckinRooms.room}::text order by ${userCheckinRooms.room}) from ${userCheckinRooms} where ${userCheckinRooms.userId} = ${authUser.id}), '{}')`,
      })
      .from(authUser)
      .leftJoin(userRoles, eq(userRoles.userId, authUser.id))
      .groupBy(authUser.id)
      .orderBy(asc(authUser.email));
    return rows.map(({ lockoutEnd, ...row }) => ({
      ...row,
      lockedUntil: lockoutEnd && lockoutEnd > new Date() ? lockoutEnd : null,
    }));
  }

  async create(input: { email: string; name: string; password: string; roles: string[]; checkinRooms?: string[] }) {
    await this.assertRolesExist(input.roles);
    const [existing] = await this.database
      .select({ id: authUser.id })
      .from(authUser)
      .where(sql`lower(${authUser.email}) = ${input.email.toLowerCase()}`)
      .limit(1);
    if (existing) {
      throw new BadRequestException({ code: 'user/email-exists', message: 'Email này đã có tài khoản.' });
    }

    const userId = randomUUID();
    const passwordHash = await hashPassword(input.password);
    await this.database.transaction(async (transaction) => {
      await transaction.insert(authUser).values({
        id: userId,
        name: input.name,
        email: input.email,
        emailVerified: true,
      });
      await transaction.insert(authAccount).values({
        id: randomUUID(),
        accountId: userId,
        providerId: 'credential',
        issuer: 'local:credential',
        userId,
        password: passwordHash,
      });
      await transaction.insert(userRoles).values(input.roles.map((roleCode) => ({ userId, roleCode })));
      await this.replaceCheckinRooms(transaction, userId, input.checkinRooms ?? []);
    });
    return this.get(userId);
  }

  async update(
    actorId: string,
    userId: string,
    input: { name?: string; roles?: string[]; checkinRooms?: string[]; disabled?: boolean },
  ) {
    const current = await this.get(userId);
    if (input.roles) await this.assertRolesExist(input.roles);

    const losesManager =
      current.roles.includes(MANAGER_ROLE) &&
      ((input.roles && !input.roles.includes(MANAGER_ROLE)) || input.disabled === true);
    if (losesManager && userId === actorId) {
      throw new BadRequestException({
        code: 'user/self-lockout',
        message: 'Không thể tự khóa hoặc bỏ quyền quản lý của chính mình.',
      });
    }

    await this.database.transaction(async (transaction) => {
      if (losesManager) await this.assertAnotherManager(transaction, userId);
      await transaction
        .update(authUser)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.disabled !== undefined ? { disabled: input.disabled } : {}),
          updatedAt: new Date(),
        })
        .where(eq(authUser.id, userId));
      if (input.roles) {
        await transaction.delete(userRoles).where(eq(userRoles.userId, userId));
        await transaction.insert(userRoles).values(input.roles.map((roleCode) => ({ userId, roleCode })));
      }
      if (input.checkinRooms) await this.replaceCheckinRooms(transaction, userId, input.checkinRooms);
      // Role or status changes take effect on the next request, not after the session expires.
      if (input.roles || input.disabled) {
        await transaction.delete(authSession).where(eq(authSession.userId, userId));
      }
    });
    return this.get(userId);
  }

  async setPassword(userId: string, password: string) {
    await this.get(userId);
    const passwordHash = await hashPassword(password);
    await this.database.transaction(async (transaction) => {
      const updated = await transaction
        .update(authAccount)
        .set({ password: passwordHash, updatedAt: new Date() })
        .where(and(eq(authAccount.userId, userId), eq(authAccount.providerId, 'credential')))
        .returning({ id: authAccount.id });
      if (!updated.length) {
        await transaction.insert(authAccount).values({
          id: randomUUID(),
          accountId: userId,
          providerId: 'credential',
          issuer: 'local:credential',
          userId,
          password: passwordHash,
        });
      }
      await transaction
        .update(authUser)
        .set({ passwordResetRequired: false, failedLoginAttempts: 0, lockoutEnd: null, updatedAt: new Date() })
        .where(eq(authUser.id, userId));
      await transaction.delete(authSession).where(eq(authSession.userId, userId));
    });
  }

  async delete(actorId: string, userId: string) {
    if (userId === actorId) {
      throw new BadRequestException({ code: 'user/self-delete', message: 'Không thể xóa tài khoản của chính mình.' });
    }
    const current = await this.get(userId);
    await this.database.transaction(async (transaction) => {
      if (current.roles.includes(MANAGER_ROLE)) await this.assertAnotherManager(transaction, userId);
      await transaction.delete(authUser).where(eq(authUser.id, userId));
    });
  }

  private async get(userId: string): Promise<UserSummary> {
    const user = (await this.list()).find((item) => item.id === userId);
    if (!user) throw new NotFoundException({ code: 'user/not-found', message: 'Không tìm thấy tài khoản.' });
    return user;
  }

  private async replaceCheckinRooms(transaction: Transaction, userId: string, rooms: string[]) {
    await transaction.delete(userCheckinRooms).where(eq(userCheckinRooms.userId, userId));
    if (rooms.length) {
      await transaction.insert(userCheckinRooms).values(rooms.map((room) => ({ userId, room })));
    }
  }

  private async assertRolesExist(requested: string[]) {
    const found = await this.database
      .select({ code: roles.code })
      .from(roles)
      .where(inArray(roles.code, requested));
    const missing = requested.filter((code) => !found.some((role) => role.code === code));
    if (missing.length) {
      throw new BadRequestException({
        code: 'user/invalid-role',
        message: `Vai trò không hợp lệ: ${missing.join(', ')}`,
      });
    }
  }

  // Keeps at least one enabled manager so nobody can lock the system out of user management.
  private async assertAnotherManager(transaction: Transaction, excludedUserId: string) {
    const [other] = await transaction
      .select({ id: authUser.id })
      .from(authUser)
      .innerJoin(userRoles, eq(userRoles.userId, authUser.id))
      .where(and(eq(userRoles.roleCode, MANAGER_ROLE), eq(authUser.disabled, false), ne(authUser.id, excludedUserId)))
      .limit(1);
    if (!other) {
      throw new BadRequestException({
        code: 'user/last-manager',
        message: 'Phải còn ít nhất một tài khoản quản lý đang hoạt động.',
      });
    }
  }
}
