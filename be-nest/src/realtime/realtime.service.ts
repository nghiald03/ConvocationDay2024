import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  DataChangeTopic,
  PhotoQueueChanged,
  ServerToClientEvents,
  TtsBroadcast,
} from './realtime-events.js';

/** Các thay đổi dồn dập trong khoảng này được gom thành một sự kiện (import hàng nghìn dòng chỉ ra vài sự kiện). */
export const DATA_CHANGE_COALESCE_MS = 250;

type PendingChange = {
  topics: Set<DataChangeTopic>;
  hallIds: Set<number>;
  sessionIds: Set<number>;
  /** Có thay đổi không nêu phạm vi: phải coi như ảnh hưởng mọi side và phiên. */
  unscoped: boolean;
};

@Injectable()
export class RealtimeService implements OnModuleDestroy {
  private server?: Server<ClientToServerEvents, ServerToClientEvents>;
  private pending: PendingChange | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  attach(server: Server<ClientToServerEvents, ServerToClientEvents>): void {
    this.server = server;
  }

  emitAll(event: 'SendMessage' | 'ReceiveNotify', data: unknown): void {
    this.server?.emit(event, data);
  }

  broadcastTts(data: TtsBroadcast): void {
    this.server?.to('role:NO').emit('ReceiveTTSBroadcast', data);
  }

  /**
   * Báo cho mọi client biết dữ liệu `topic` vừa đổi để họ tải lại, thay vì hỏi liên tục.
   * Gọi SAU KHI transaction đã commit, nếu không client tải về dữ liệu cũ.
   * Sự kiện được gom trong DATA_CHANGE_COALESCE_MS; chỉ chứa mã chủ đề và phạm vi, không chứa dữ liệu cá nhân.
   */
  dataChanged(topic: DataChangeTopic, scope: { hallId?: number | null | undefined; sessionId?: number | null | undefined } = {}): void {
    this.pending ??= { topics: new Set(), hallIds: new Set(), sessionIds: new Set(), unscoped: false };
    this.pending.topics.add(topic);
    if (typeof scope.hallId === 'number') this.pending.hallIds.add(scope.hallId);
    if (typeof scope.sessionId === 'number') this.pending.sessionIds.add(scope.sessionId);
    if (typeof scope.hallId !== 'number' && typeof scope.sessionId !== 'number') this.pending.unscoped = true;
    this.flushTimer ??= setTimeout(() => this.flushDataChanged(), DATA_CHANGE_COALESCE_MS);
  }

  /** Phát ngay các thay đổi đang chờ gom (dùng khi tắt dịch vụ và trong test). */
  flushDataChanged(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = null;
    const change = this.pending;
    this.pending = null;
    if (!change) return;
    this.server?.emit('data:changed', {
      eventId: randomUUID(),
      serverTimestamp: new Date().toISOString(),
      data: {
        topics: [...change.topics],
        // Có thay đổi không nêu phạm vi thì để rỗng: client hiểu là mọi side và phiên.
        hallIds: change.unscoped ? [] : [...change.hallIds],
        sessionIds: change.unscoped ? [] : [...change.sessionIds],
      },
    });
  }

  /**
   * Ngắt mọi kết nối của một tài khoản. Phòng `user:` và `role:` chỉ được vào lúc bắt tay kết nối, nên khi vai trò đổi,
   * tài khoản bị khóa, đổi mật khẩu hoặc bị xóa thì kết nối đang mở vẫn giữ phòng cũ (và vẫn nhận tin) cho tới khi ngắt.
   * Đăng nhập lại thì kết nối mới sẽ vào đúng phòng theo vai trò hiện tại.
   */
  disconnectUser(userId: string): void {
    this.server?.in(`user:${userId}`).disconnectSockets(true);
  }

  onModuleDestroy(): void {
    this.flushDataChanged();
  }

  notificationChanged(notificationId: number, status: string): void {
    this.server?.emit('notification:changed', {
      eventId: randomUUID(),
      serverTimestamp: new Date().toISOString(),
      data: { notificationId, status },
    });
  }

  photoQueueChanged(data: PhotoQueueChanged): void {
    this.server?.emit('photo-queue:changed', {
      eventId: randomUUID(),
      serverTimestamp: new Date().toISOString(),
      data,
    });
  }
}
