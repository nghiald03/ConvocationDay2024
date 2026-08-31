import { Inject, Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { eq, lt } from 'drizzle-orm';
import type { IncomingHttpHeaders } from 'node:http';
import { fromNodeHeaders } from 'better-auth/node';
import { DATABASE } from '../database/database.constants.js';
import type { AppDatabase } from '../database/database.types.js';
import { authUser, authSession, userRoles } from '../database/schema/schema.js';
import type { ActorContext } from '../common/guards/actor-context.js';
import { expandPermissions } from './permissions.js';
import type { ConvocationAuth } from './auth.factory.js';

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly authService: AuthService<ConvocationAuth>,
    @Inject(DATABASE) private readonly database: AppDatabase,
  ) {}

  get auth(): ConvocationAuth {
    return this.authService.instance;
  }

  async resolve(headers: IncomingHttpHeaders): Promise<ActorContext | null> {
    const result = await this.auth.api.getSession({
      headers: fromNodeHeaders(headers),
      query: { disableCookieCache: true },
    });
    if (!result) return null;

    const [user] = await this.database
      .select({
        id: authUser.id,
        email: authUser.email,
        name: authUser.name,
        disabled: authUser.disabled,
      })
      .from(authUser)
      .where(eq(authUser.id, result.user.id))
      .limit(1);
    if (!user || user.disabled) return null;

    const roleRows = await this.database
      .select({ role: userRoles.roleCode })
      .from(userRoles)
      .where(eq(userRoles.userId, user.id));
    const roles = roleRows.map(({ role }) => role);
    return {
      userId: user.id,
      email: user.email,
      fullName: user.name,
      roles,
      permissions: expandPermissions(roles),
    };
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.database.delete(authSession).where(eq(authSession.userId, userId));
  }

  async deleteExpiredSessions(): Promise<number> {
    const deleted = await this.database
      .delete(authSession)
      .where(lt(authSession.expiresAt, new Date()))
      .returning({ id: authSession.id });
    return deleted.length;
  }
}
