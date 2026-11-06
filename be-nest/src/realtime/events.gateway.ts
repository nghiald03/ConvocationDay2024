import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AuthSessionService } from '../auth/auth-session.service.js';
import { Permission } from '../auth/permissions.js';
import type { ActorContext } from '../common/guards/actor-context.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  TtsBroadcast,
} from './realtime-events.js';
import { RealtimeService } from './realtime.service.js';
import { parseTrustedOrigins } from '../config/environment.js';

type SocketData = { actor: ActorContext; sessionExpiresAt?: number };
type EventSocket = Socket<ClientToServerEvents, ServerToClientEvents, never, SocketData>;

/** Chờ tối thiểu chừng này giữa hai lần kiểm tra để phiên hết hạn đúng lúc không gây vòng lặp sát nhau. */
export const SESSION_CHECK_MIN_MS = 30_000;
/** Không tin vào thời điểm hết hạn xa hơn mức này (kể cả khi thiếu): kiểm tra lại ít nhất mỗi 15 phút. */
export const SESSION_CHECK_MAX_MS = 15 * 60_000;
export const SESSION_EXPIRED_MESSAGE = 'Phiên đăng nhập đã hết hạn hoặc quyền đã thay đổi. Vui lòng đăng nhập lại.';

/**
 * Bao lâu nữa thì kiểm tra lại phiên của một kết nối: đúng lúc phiên dự kiến hết hạn.
 * Lúc đó phiên có thể đã được gia hạn (nhịp sống của frontend) nên cần hỏi lại chứ không ngắt ngay.
 */
export function sessionCheckDelay(expiresAtMs: number | undefined, nowMs: number): number {
  const untilExpiry = expiresAtMs === undefined ? SESSION_CHECK_MAX_MS : expiresAtMs - nowMs;
  return Math.min(SESSION_CHECK_MAX_MS, Math.max(SESSION_CHECK_MIN_MS, untilExpiry));
}
type Acknowledge = (result: { ok: boolean; message?: string }) => void;

export function isLoopbackDevelopmentOrigin(origin: string, nodeEnvironment: string): boolean {
  if (nodeEnvironment !== 'development') return false;
  try {
    const url = new URL(origin);
    return ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return false;
  }
}

@WebSocketGateway({
  namespace: '/events',
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);
  /** Hẹn giờ kiểm tra phiên theo từng kết nối (khóa là mã socket). */
  private readonly sessionTimers = new Map<string, ReturnType<typeof setTimeout>>();

  @WebSocketServer()
  server!: Server<ClientToServerEvents, ServerToClientEvents>;

  constructor(
    private readonly sessions: AuthSessionService,
    private readonly realtime: RealtimeService,
    private readonly config: ConfigService,
  ) {}

  afterInit(server: Server<ClientToServerEvents, ServerToClientEvents>): void {
    this.realtime.attach(server);
    server.use((socket: EventSocket, next) => {
      void this.authenticateSocket(socket, next);
    });
  }

  private async authenticateSocket(socket: EventSocket, next: (error?: Error) => void): Promise<void> {
      try {
        const origin = socket.handshake.headers.origin;
        const trustedOrigins = parseTrustedOrigins(this.config.getOrThrow<string>('TRUSTED_ORIGINS'));
        const nodeEnvironment = this.config.get<string>('NODE_ENV', 'development');
        if (
          origin &&
          !trustedOrigins.includes(origin) &&
          !isLoopbackDevelopmentOrigin(origin, nodeEnvironment)
        ) {
          const error = new Error('Nguồn kết nối realtime không được tin cậy.');
          Object.assign(error, { data: { code: 'auth/untrusted-origin' } });
          next(error);
          return;
        }
        const resolved = await this.sessions.resolveWithExpiry(socket.handshake.headers);
        const actor = resolved?.actor;
        if (!resolved || !actor) {
          const error = new Error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
          Object.assign(error, { data: { code: 'auth/unauthorized' } });
          next(error);
          return;
        }
        socket.data.actor = actor;
        socket.data.sessionExpiresAt = resolved.expiresAt.getTime();
        await Promise.all([
          socket.join(`user:${actor.userId}`),
          ...actor.roles.map((role) => socket.join(`role:${role}`)),
        ]);
        next();
      } catch (error) {
        this.logger.warn('Từ chối kết nối Socket.IO do xác thực thất bại.');
        next(error instanceof Error ? error : new Error('Không thể xác thực kết nối.'));
      }
  }

  handleConnection(socket: EventSocket): void {
    this.scheduleSessionCheck(socket);
  }

  handleDisconnect(socket: EventSocket): void {
    this.clearSessionTimer(socket.id);
  }

  private scheduleSessionCheck(socket: EventSocket): void {
    this.clearSessionTimer(socket.id);
    const timer = setTimeout(
      () => void this.checkSession(socket),
      sessionCheckDelay(socket.data.sessionExpiresAt, Date.now()),
    );
    timer.unref();
    this.sessionTimers.set(socket.id, timer);
  }

  private clearSessionTimer(socketId: string): void {
    const timer = this.sessionTimers.get(socketId);
    if (timer) clearTimeout(timer);
    this.sessionTimers.delete(socketId);
  }

  /**
   * Chạy đúng lúc phiên dự kiến hết hạn. Phiên còn hợp lệ (đã được gia hạn) thì hẹn tiếp theo hạn mới;
   * hết hạn, bị xóa, bị khóa hoặc đổi sang tài khoản khác thì báo lý do rồi ngắt để không nhận tin bằng phiên cũ.
   */
  async checkSession(socket: EventSocket): Promise<void> {
    if (!socket.connected) return;
    try {
      const resolved = await this.sessions.resolveWithExpiry(socket.handshake.headers);
      if (resolved && resolved.actor.userId === socket.data.actor.userId) {
        socket.data.sessionExpiresAt = resolved.expiresAt.getTime();
        this.scheduleSessionCheck(socket);
        return;
      }
    } catch (error) {
      // Lỗi tạm thời (ví dụ DB chớp) không phải lý do để đuổi người đang dùng: thử lại ở lần kiểm tra sau.
      this.logger.warn(`Không kiểm tra lại được phiên của kết nối realtime: ${error instanceof Error ? error.message : String(error)}`);
      this.scheduleSessionCheck(socket);
      return;
    }
    socket.emit('authorization:error', { code: 'auth/session-expired', message: SESSION_EXPIRED_MESSAGE });
    socket.disconnect(true);
  }

  @SubscribeMessage('publish-domain-event')
  publishDomainEvent(
    @ConnectedSocket() socket: EventSocket,
    @MessageBody() command: { event: 'SendMessage' | 'ReceiveNotify'; data: unknown },
    acknowledge?: Acknowledge,
  ): void {
    if (!socket.data.actor.permissions.includes(Permission.ControlLed)) {
      acknowledge?.({ ok: false, message: 'Bạn không có quyền điều khiển màn hình LED.' });
      return;
    }
    if (!['SendMessage', 'ReceiveNotify'].includes(command.event)) {
      acknowledge?.({ ok: false, message: 'Loại sự kiện không được phép.' });
      return;
    }
    this.realtime.emitAll(command.event, command.data);
    acknowledge?.({ ok: true });
  }

  @SubscribeMessage('broadcast-tts')
  broadcastTts(
    @ConnectedSocket() socket: EventSocket,
    @MessageBody() command: TtsBroadcast,
    acknowledge?: Acknowledge,
  ): void {
    if (!socket.data.actor.permissions.includes(Permission.BroadcastNotifications)) {
      acknowledge?.({ ok: false, message: 'Bạn không có quyền phát thông báo.' });
      return;
    }
    this.realtime.broadcastTts(command);
    acknowledge?.({ ok: true });
  }
}
