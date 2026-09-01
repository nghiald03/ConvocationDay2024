import { describe, expect, test } from 'bun:test';
import type { AppDatabase } from '../database/database.types.js';
import type { RealtimeService } from '../realtime/realtime.service.js';
import { PhotoQueueService } from './photo-queue.service.js';

const actor = {
  userId: 'actor-1',
  email: 'coordinator@example.edu.vn',
  fullName: 'Coordinator',
  roles: [],
  permissions: [],
};

const realtime = {
  photoQueueChanged: () => undefined,
} as unknown as RealtimeService;

describe('PhotoQueueService coordinator state', () => {
  test('marks a not-photographed confirmation as absent instead of waiting', async () => {
    let selectCount = 0;
    let updateCount = 0;
    let photoStatus: string | undefined;
    const transaction = {
      select: () => {
        selectCount += 1;
        if (selectCount === 1) {
          return {
            from: () => ({
              where: () => ({
                limit: () => ({
                  for: () =>
                    Promise.resolve([{ id: 1, currentNumber: 7 }]),
                }),
              }),
            }),
          };
        }
        return {
          from: () => ({
            innerJoin: () => ({
              where: () => ({
                limit: () =>
                  Promise.resolve([
                    { studentCode: 'SE170198', fullName: 'Lê Đại Nghĩa' },
                  ]),
              }),
            }),
          }),
        };
      },
      update: () => ({
        set: (values: { photoStatus?: string }) => {
          updateCount += 1;
          if (updateCount === 2) photoStatus = values.photoStatus;
          return { where: () => Promise.resolve() };
        },
      }),
      insert: () => ({ values: () => Promise.resolve() }),
    };
    const database = {
      transaction: (operation: (tx: unknown) => Promise<unknown>) => operation(transaction),
    } as unknown as AppDatabase;
    const service = new PhotoQueueService(database, realtime);

    await service.confirmCurrent(
      1,
      { photographed: false, notPhotographedReason: 'Vắng' },
      actor,
    );

    expect(photoStatus).toBe('ABSENT');
  });

  test('next skips photographed numbers after returning to an earlier waiting number', async () => {
    let selectCount = 0;
    let insertCount = 0;
    let updatedCurrentNumber: number | undefined;
    const transaction = {
      select: () => {
        selectCount += 1;
        if (selectCount === 1) {
          return {
            from: () => ({
              where: () => ({ limit: () => Promise.resolve([{ id: 1 }]) }),
            }),
          };
        }
        return {
          from: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => ({
                  for: () => Promise.resolve([{ queueNumber: 4 }]),
                }),
              }),
            }),
          }),
        };
      },
      insert: () => {
        insertCount += 1;
        if (insertCount === 1) {
          return {
            values: () => ({
              onConflictDoUpdate: () => ({
                returning: () =>
                  Promise.resolve([
                    {
                      id: 1,
                      currentNumber: 2,
                      currentPhotoConfirmed: true,
                      manualReturnNumber: null,
                    },
                  ]),
              }),
            }),
          };
        }
        return { values: () => Promise.resolve() };
      },
      update: () => ({
        set: (values: { currentNumber: number }) => {
          updatedCurrentNumber = values.currentNumber;
          return {
            where: () => ({ returning: () => Promise.resolve([values]) }),
          };
        },
      }),
    };
    const database = {
      transaction: (operation: (tx: unknown) => Promise<unknown>) => operation(transaction),
    } as unknown as AppDatabase;
    const service = new PhotoQueueService(database, realtime);

    const result = await service.next(1, actor);

    expect(updatedCurrentNumber).toBe(4);
    expect(result.currentNumber).toBe(4);
  });

  test('requires a reason when confirming that the current person was not photographed', async () => {
    const service = new PhotoQueueService({} as AppDatabase, realtime);

    let error: unknown;
    try {
      await service.confirmCurrent(
        1,
        { photographed: false, notPhotographedReason: '   ' },
        actor,
      );
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Vui lòng nhập lý do chưa chụp.');
  });

  test('publishes a realtime change after creating a photo session', async () => {
    const changes: unknown[] = [];
    const database = {
      insert: () => ({
        values: () => ({
          returning: () => Promise.resolve([{ id: 9, name: 'Ca sáng' }]),
        }),
      }),
    } as unknown as AppDatabase;
    const realtimeWithCapture = {
      photoQueueChanged: (change: unknown) => changes.push(change),
    } as unknown as RealtimeService;
    const service = new PhotoQueueService(database, realtimeWithCapture);

    await service.createSession('Ca sáng');

    expect(changes).toEqual([
      { photoSessionIds: [9], sessionsChanged: true },
    ]);
  });

  test('returns the current confirmation state to coordinator clients', async () => {
    const service = new PhotoQueueService({} as AppDatabase, realtime);
    const serviceInternals = service as unknown as {
      ensureState: () => Promise<Record<string, unknown>>;
      entryWithBachelor: (_photoSessionId: number, queueNumber: number) => Promise<unknown[]>;
      nextWaitingEntryWithBachelor: () => Promise<unknown[]>;
    };
    serviceInternals.ensureState = () =>
      Promise.resolve({
        currentNumber: 7,
        currentPhotoConfirmed: true,
        currentPhotoTaken: true,
      });
    serviceInternals.entryWithBachelor = (_photoSessionId, queueNumber) =>
      Promise.resolve(queueNumber === 7 ? [{ queueNumber: 7 }] : []);
    serviceInternals.nextWaitingEntryWithBachelor = () => Promise.resolve([]);

    const state = await service.publicState(1);

    expect(state).toMatchObject({
      currentNumber: 7,
      currentPhotoConfirmed: true,
      currentPhotoTaken: true,
    });
  });

  test('returns a correctly encoded message when there is no waiting number to return to', async () => {
    const transaction = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ id: 1 }]),
          }),
        }),
      }),
      insert: () => ({
        values: () => ({
          onConflictDoUpdate: () => ({
            returning: () =>
              Promise.resolve([
                {
                  id: 1,
                  currentNumber: 1,
                  currentPhotoConfirmed: true,
                  manualReturnNumber: null,
                },
              ]),
          }),
        }),
      }),
    };
    const database = {
      transaction: (operation: (tx: unknown) => Promise<unknown>) => operation(transaction),
    } as unknown as AppDatabase;
    const service = new PhotoQueueService(database, realtime);

    let error: unknown;
    try {
      await service.previous(1, actor);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(
      'Không có số phía trước chưa chụp để quay lại.',
    );
  });
});
