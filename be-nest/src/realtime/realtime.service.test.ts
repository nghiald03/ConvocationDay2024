import { describe, expect, test } from 'bun:test';
import type { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  PhotoQueueChanged,
  RealtimeEnvelope,
  ServerToClientEvents,
} from './realtime-events.js';
import { RealtimeService } from './realtime.service.js';

type EmittedPhotoQueueEvent = [
  'photo-queue:changed',
  RealtimeEnvelope<PhotoQueueChanged>,
];

describe('RealtimeService photo queue events', () => {
  test('emits a typed photo queue change envelope', () => {
    const emitted: EmittedPhotoQueueEvent[] = [];
    const server = {
      emit: (...args: unknown[]) => {
        emitted.push(args as EmittedPhotoQueueEvent);
      },
    } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
    const realtime = new RealtimeService();
    realtime.attach(server);

    realtime.photoQueueChanged({
      photoSessionIds: [3],
      activeSessionChanged: true,
    });

    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.[0]).toBe('photo-queue:changed');
    expect(typeof emitted[0]?.[1].eventId).toBe('string');
    expect(typeof emitted[0]?.[1].serverTimestamp).toBe('string');
    expect(emitted[0]?.[1].data).toEqual({
      photoSessionIds: [3],
      activeSessionChanged: true,
    });
  });
});
