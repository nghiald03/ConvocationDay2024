import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ActorContext } from '../common/guards/actor-context.js';

/** 32 ký tự (bỏ I, O, 0, 1 dễ nhầm): 256 chia hết cho 32 nên lấy byte % 32 không lệch. */
export const FORCE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const FORCE_CODE_LENGTH = 4;
export const FORCE_CODE_WINDOW_MS = 5 * 60 * 1000;
export const FORCE_CODE_MAX_FAILURES = 5;
/** Vai trò xem được mã (Check-in Lead, Manager) nên không phải nhập mã cho các thao tác ngoài luồng. */
export const FORCE_CODE_HOLDER_ROLES = ['CL', 'MN'];

export function holdsForceCode(actor: Pick<ActorContext, 'roles'>): boolean {
  return actor.roles.some((role) => FORCE_CODE_HOLDER_ROLES.includes(role.toUpperCase()));
}

/**
 * Mã force check-in đổi sau mỗi 5 phút, tính từ khóa bí mật của server nên không cần lưu ở đâu.
 * Nhận cả mã của khung trước để CK vừa nhận mã lúc sắp đổi vẫn dùng được.
 */
@Injectable()
export class ForceCheckInCodeService {
  private readonly logger = new Logger(ForceCheckInCodeService.name);
  private readonly secret: string;
  private readonly failures = new Map<string, { count: number; lockedUntil: number }>();

  /** Đồng hồ thay được trong test. */
  clock: () => number = () => Date.now();

  constructor(config: ConfigService) {
    this.secret = config.getOrThrow<string>('BETTER_AUTH_SECRET');
  }

  private now(): number {
    return this.clock();
  }

  current() {
    const now = this.now();
    const window = Math.floor(now / FORCE_CODE_WINDOW_MS);
    return {
      code: this.codeFor(window),
      expiresInMs: (window + 1) * FORCE_CODE_WINDOW_MS - now,
    };
  }

  /**
   * Thao tác ngoài luồng (check-in trễ, chuyển ca, chuyển phiên tạm): nhân viên check-in phải nhập mã khẩn cấp;
   * Check-in Lead và Manager giữ mã nên được làm trực tiếp.
   */
  requireFor(actor: Pick<ActorContext, 'userId' | 'roles'>, input: string | undefined, action: string): void {
    if (holdsForceCode(actor)) return;
    if (!input?.trim()) {
      throw new BadRequestException({
        code: 'checkin/emergency-code-required',
        message: `${action} cần mã khẩn cấp. Hỏi Check-in Lead hoặc Manager để lấy mã 4 ký tự.`,
      });
    }
    this.assertValid(actor.userId, input);
  }

  assertValid(actorId: string, input: string): void {
    const now = this.now();
    const state = this.failures.get(actorId);
    if (state && state.lockedUntil > now) {
      const minutes = Math.ceil((state.lockedUntil - now) / 60_000);
      throw new HttpException(
        {
          code: 'checkin/force-code-locked',
          message: `Nhập sai mã khẩn cấp quá ${FORCE_CODE_MAX_FAILURES} lần. Thử lại sau ${minutes} phút.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const window = Math.floor(now / FORCE_CODE_WINDOW_MS);
    const normalized = Buffer.from(input.trim().toUpperCase());
    const valid = [window, window - 1].some((candidate) => {
      const expected = Buffer.from(this.codeFor(candidate));
      return normalized.length === expected.length && timingSafeEqual(normalized, expected);
    });
    if (valid) {
      this.failures.delete(actorId);
      return;
    }

    // Khóa đã hết hạn thì đếm lại từ đầu.
    const count = (state?.lockedUntil === 0 ? state.count : 0) + 1;
    const lockedUntil = count >= FORCE_CODE_MAX_FAILURES ? now + FORCE_CODE_WINDOW_MS : 0;
    this.failures.set(actorId, { count, lockedUntil });
    this.logger.warn(`Sai mã force check-in: tài khoản ${actorId}, lần ${count}`);
    throw new BadRequestException({
      code: 'checkin/force-code-invalid',
      message: 'Mã khẩn cấp không đúng hoặc đã hết hạn. Hỏi Check-in Lead hoặc Manager để lấy mã mới.',
    });
  }

  private codeFor(window: number): string {
    const digest = createHmac('sha256', this.secret).update(`force-checkin:${window}`).digest();
    return Array.from(digest.subarray(0, FORCE_CODE_LENGTH), (byte) => FORCE_CODE_ALPHABET[byte % 32]).join('');
  }
}
