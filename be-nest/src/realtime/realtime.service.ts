import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  TtsBroadcast,
} from './realtime-events.js';

@Injectable()
export class RealtimeService {
  private server?: Server<ClientToServerEvents, ServerToClientEvents>;

  attach(server: Server<ClientToServerEvents, ServerToClientEvents>): void {
    this.server = server;
  }

  emitAll(event: 'SendMessage' | 'ReceiveNotify', data: unknown): void {
    this.server?.emit(event, data);
  }

  broadcastTts(data: TtsBroadcast): void {
    this.server?.to('role:NO').emit('ReceiveTTSBroadcast', data);
  }

  notificationChanged(notificationId: number, status: string): void {
    this.server?.emit('notification:changed', {
      eventId: randomUUID(),
      serverTimestamp: new Date().toISOString(),
      data: { notificationId, status },
    });
  }
}
