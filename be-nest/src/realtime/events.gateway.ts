import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
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

type EventSocket = Socket<ClientToServerEvents, ServerToClientEvents, never, { actor: ActorContext }>;
type Acknowledge = (result: { ok: boolean; message?: string }) => void;

@WebSocketGateway({
  namespace: '/events',
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayInit {
  private readonly logger = new Logger(EventsGateway.name);

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
        if (origin && !trustedOrigins.includes(origin)) {
          const error = new Error('Nguồn kết nối realtime không được tin cậy.');
          Object.assign(error, { data: { code: 'auth/untrusted-origin' } });
          next(error);
          return;
        }
        const actor = await this.sessions.resolve(socket.handshake.headers);
        if (!actor) {
          const error = new Error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
          Object.assign(error, { data: { code: 'auth/unauthorized' } });
          next(error);
          return;
        }
        socket.data.actor = actor;
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
