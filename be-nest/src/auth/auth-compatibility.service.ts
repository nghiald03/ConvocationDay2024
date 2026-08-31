import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APIError, isAPIError } from 'better-auth/api';
import { hashPassword } from 'better-auth/crypto';
import { fromNodeHeaders } from 'better-auth/node';
import { and, eq, gt, sql } from 'drizzle-orm';
import type { IncomingHttpHeaders } from 'node:http';
import { DATABASE } from '../database/database.constants.js';
import type { AppDatabase } from '../database/database.types.js';
import {
  authAccount,
  authSession,
  authUser,
  authVerification,
  legacyIdentityCredentials,
  userRoles,
} from '../database/schema/schema.js';
import { ApiError } from '../common/errors/api-error.js';
import type { ActorContext } from '../common/guards/actor-context.js';
import { AuthSessionService } from './auth-session.service.js';
import { isAspNetIdentityV3Hash } from './legacy-password.js';
import { expandPermissions } from './permissions.js';

export interface AuthResponse<T> {
  data: T;
  headers?: Headers;
}

@Injectable()
export class AuthCompatibilityService {
  constructor(
    private readonly sessions: AuthSessionService,
    private readonly config: ConfigService,
    @Inject(DATABASE) private readonly database: AppDatabase,
  ) {}

  async login(
    email: string,
    password: string,
    headers: IncomingHttpHeaders,
  ): Promise<AuthResponse<ActorContext>> {
    const [user] = await this.database
      .select()
      .from(authUser)
      .where(sql`lower(${authUser.email}) = ${email.toLowerCase()}`)
      .limit(1);

    if (!user || user.disabled) throw this.invalidCredentials();
    if (user.lockoutEnd && user.lockoutEnd > new Date()) {
      throw this.invalidCredentials();
    }

    try {
      const result = await this.sessions.auth.api.signInEmail({
        body: { email: user.email, password, rememberMe: false },
        headers: fromNodeHeaders(headers),
        returnHeaders: true,
      });
      await this.database
        .update(authUser)
        .set({ failedLoginAttempts: 0, lockoutEnd: null, updatedAt: new Date() })
        .where(eq(authUser.id, user.id));
      await this.rehashLegacyCredential(user.id, password);
      if (user.passwordResetRequired) {
        await this.sessions.revokeAllSessions(user.id);
        throw new ApiError(403, 'auth/password-reset-required', 'Bạn cần đặt lại mật khẩu trước khi tiếp tục.');
      }
      const actor = await this.actorForUser(user.id);
      return { data: actor, headers: result.headers };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      await this.recordFailedLogin(user.id, user.failedLoginAttempts);
      if (isAPIError(error) || error instanceof APIError) throw this.invalidCredentials();
      throw error;
    }
  }

  async logout(headers: IncomingHttpHeaders): Promise<Headers> {
    const result = await this.sessions.auth.api.signOut({
      headers: fromNodeHeaders(headers),
      returnHeaders: true,
    });
    return result.headers;
  }

  async changePassword(
    actor: ActorContext,
    currentPassword: string,
    newPassword: string,
    headers: IncomingHttpHeaders,
  ): Promise<Headers | undefined> {
    try {
      const result = await this.sessions.auth.api.changePassword({
        body: { currentPassword, newPassword, revokeOtherSessions: true },
        headers: fromNodeHeaders(headers),
        returnHeaders: true,
      });
      await this.database
        .update(authUser)
        .set({ passwordResetRequired: false, updatedAt: new Date() })
        .where(eq(authUser.id, actor.userId));
      return result.headers;
    } catch (error) {
      if (isAPIError(error)) {
        throw new ApiError(400, 'auth/password-change-failed', 'Không thể thay đổi mật khẩu.');
      }
      throw error;
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    const origin = this.config.getOrThrow<string>('TRUSTED_ORIGINS').split(',')[0]?.trim();
    try {
      await this.sessions.auth.api.requestPasswordReset({
        body: {
          email,
          ...(origin ? { redirectTo: `${origin}/reset-password` } : {}),
        },
      });
    } catch (error) {
      // Preserve account-enumeration resistance. Operational failures are logged by Better Auth.
      if (!isAPIError(error)) throw error;
    }
  }

  async confirmPasswordReset(email: string, token: string, newPassword: string): Promise<void> {
    const [verification] = await this.database
      .select({ userId: authVerification.value })
      .from(authVerification)
      .where(and(
        eq(authVerification.identifier, `reset-password:${token}`),
        gt(authVerification.expiresAt, new Date()),
      ))
      .limit(1);
    const [user] = verification
      ? await this.database
          .select({ id: authUser.id, email: authUser.email })
          .from(authUser)
          .where(eq(authUser.id, verification.userId))
          .limit(1)
      : [];
    if (!user || user.email.toLowerCase() !== email.toLowerCase()) {
      throw new ApiError(400, 'auth/invalid-reset', 'Yêu cầu đặt lại mật khẩu không hợp lệ.');
    }

    try {
      await this.sessions.auth.api.resetPassword({ body: { token, newPassword } });
    } catch (error) {
      if (isAPIError(error)) {
        throw new ApiError(400, 'auth/invalid-reset', 'Yêu cầu đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
      }
      throw error;
    }

    await this.database.transaction(async (transaction) => {
      await transaction
        .update(authUser)
        .set({
          passwordResetRequired: false,
          failedLoginAttempts: 0,
          lockoutEnd: null,
          updatedAt: new Date(),
        })
        .where(eq(authUser.id, user.id));
      await transaction.delete(authSession).where(eq(authSession.userId, user.id));
      await transaction
        .update(legacyIdentityCredentials)
        .set({ passwordResetRequired: false, migratedAt: new Date() })
        .where(eq(legacyIdentityCredentials.authUserId, user.id));
    });
  }

  private async recordFailedLogin(userId: string, previousAttempts: number): Promise<void> {
    const attempts = previousAttempts + 1;
    await this.database
      .update(authUser)
      .set({
        failedLoginAttempts: attempts >= 5 ? 0 : attempts,
        lockoutEnd: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
        updatedAt: new Date(),
      })
      .where(eq(authUser.id, userId));
  }

  private async rehashLegacyCredential(userId: string, password: string): Promise<void> {
    const [account] = await this.database
      .select({ id: authAccount.id, password: authAccount.password })
      .from(authAccount)
      .where(and(eq(authAccount.userId, userId), eq(authAccount.providerId, 'credential')))
      .limit(1);
    if (!account?.password || !isAspNetIdentityV3Hash(account.password)) return;

    const replacement = await hashPassword(password);
    await this.database.transaction(async (transaction) => {
      await transaction
        .update(authAccount)
        .set({ password: replacement, updatedAt: new Date() })
        .where(eq(authAccount.id, account.id));
      await transaction
        .update(legacyIdentityCredentials)
        .set({ migratedAt: new Date(), passwordResetRequired: false })
        .where(eq(legacyIdentityCredentials.authUserId, userId));
    });
  }

  private async actorForUser(userId: string): Promise<ActorContext> {
    const [user] = await this.database
      .select({ email: authUser.email, name: authUser.name })
      .from(authUser)
      .where(eq(authUser.id, userId))
      .limit(1);
    if (!user) throw new UnauthorizedException();
    const rows = await this.database
      .select({ role: userRoles.roleCode })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));
    const roles = rows.map(({ role }) => role);
    return {
      userId,
      email: user.email,
      fullName: user.name,
      roles,
      permissions: expandPermissions(roles),
    };
  }

  private invalidCredentials(): ApiError {
    return new ApiError(401, 'auth/invalid-credentials', 'Email hoặc mật khẩu không chính xác.');
  }
}
