import type { ConfigService } from '@nestjs/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { createTransport } from 'nodemailer';
import { parseTrustedOrigins } from '../config/environment.js';
import type { AppDatabase } from '../database/database.types.js';
import { betterAuthSchema } from '../database/schema/auth-schema.js';
import { isAspNetIdentityV3Hash, verifyAspNetIdentityV3Password } from './legacy-password.js';

export function createAuth(database: AppDatabase, config: ConfigService) {
  const production = config.getOrThrow<string>('NODE_ENV') === 'production';
  const smtpHost = config.get<string>('SMTP_HOST');

  return betterAuth({
    appName: 'Convocation Day',
    secret: config.getOrThrow<string>('BETTER_AUTH_SECRET'),
    baseURL: config.getOrThrow<string>('BETTER_AUTH_URL'),
    basePath: '/api/internal-auth',
    trustedOrigins: parseTrustedOrigins(config.getOrThrow<string>('TRUSTED_ORIGINS')),
    database: drizzleAdapter(database, {
      provider: 'pg',
      schema: betterAuthSchema,
    }),
    user: {
      modelName: 'user',
      additionalFields: {
        legacyUserId: { type: 'string', required: false, input: false },
        disabled: { type: 'boolean', required: true, defaultValue: false, input: false },
        passwordResetRequired: {
          type: 'boolean',
          required: true,
          defaultValue: false,
          input: false,
        },
        failedLoginAttempts: { type: 'number', required: true, defaultValue: 0, input: false },
        lockoutEnd: { type: 'date', required: false, input: false },
      },
    },
    session: {
      expiresIn: 8 * 60 * 60,
      updateAge: 60 * 60,
      cookieCache: { enabled: false },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      password: {
        hash: hashPassword,
        verify: async ({ hash, password }) =>
          isAspNetIdentityV3Hash(hash)
            ? verifyAspNetIdentityV3Password(hash, password)
            : verifyPassword({ hash, password }),
      },
      sendResetPassword: async ({ user, url }) => {
        if (!smtpHost) return;
        const transporter = createTransport({
          host: smtpHost,
          port: config.getOrThrow<number>('SMTP_PORT'),
          secure: config.getOrThrow<number>('SMTP_PORT') === 465,
          auth: config.get<string>('SMTP_USER')
            ? {
                user: config.getOrThrow<string>('SMTP_USER'),
                pass: config.getOrThrow<string>('SMTP_PASSWORD'),
              }
            : undefined,
        });
        await transporter.sendMail({
          from: config.getOrThrow<string>('SMTP_FROM'),
          to: user.email,
          subject: 'Đặt lại mật khẩu hệ thống Convocation Day',
          text: `Mở liên kết sau để đặt lại mật khẩu: ${url}`,
        });
      },
    },
    rateLimit: {
      enabled: true,
      window: 15 * 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 15 * 60, max: 5 },
        '/request-password-reset': { window: 15 * 60, max: 5 },
      },
    },
    advanced: {
      useSecureCookies: production,
      defaultCookieAttributes: {
        httpOnly: true,
        secure: production,
        sameSite: 'lax',
        path: '/',
      },
    },
  });
}

export type ConvocationAuth = ReturnType<typeof createAuth>;
