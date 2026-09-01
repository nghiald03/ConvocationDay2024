import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import { Permission } from '../auth/permissions.js';
import type { ActorContext } from '../common/guards/actor-context.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import type { ConfirmPhotoQueueCurrentDto } from './dto/photo-queue.dto.js';
import { getPhotoQueueAuditDetails } from './photo-queue-audit-details.js';
import { DATABASE } from '../database/database.constants.js';
import type { AppDatabase } from '../database/database.types.js';
import {
  bachelors,
  photoQueueAssignments,
  photoQueueAuditLogs,
  photoQueueEntries,
  photoQueueSessions,
  photoQueueStates,
} from '../database/schema/domain-schema.js';

const PHOTOGRAPHED = 'PHOTOGRAPHED';
const WAITING = 'WAITING';
const ABSENT = 'ABSENT';
const CANCELLED = 'CANCELLED';

type Transaction = Parameters<Parameters<AppDatabase['transaction']>[0]>[0];

@Injectable()
export class PhotoQueueService {
  constructor(
    @Inject(DATABASE) private readonly database: AppDatabase,
    private readonly realtime: RealtimeService,
  ) {}

  async sessions() {
    return this.database
      .select()
      .from(photoQueueSessions)
      .orderBy(desc(photoQueueSessions.createdAt));
  }

  async createSession(name: string, description?: string) {
    const normalizedName = name.trim();
    if (!normalizedName) throw new BadRequestException('Vui lòng nhập tên phiên chụp ảnh.');
    const [created] = await this.database
      .insert(photoQueueSessions)
      .values({ name: normalizedName, description: description?.trim() || null })
      .returning();
    this.realtime.photoQueueChanged({
      photoSessionIds: [created!.id],
      sessionsChanged: true,
    });
    return created!;
  }

  async activeSession() {
    const [session] = await this.database
      .select()
      .from(photoQueueSessions)
      .where(and(eq(photoQueueSessions.isActive, true), eq(photoQueueSessions.isKioskActive, true)))
      .limit(1);
    return session ?? null;
  }

  async activateKioskSession(photoSessionId: number) {
    const result = await this.database.transaction(async (transaction) => {
      await this.ensurePhotoSession(transaction, photoSessionId);
      await transaction.update(photoQueueSessions).set({ isKioskActive: false });
      const [updated] = await transaction
        .update(photoQueueSessions)
        .set({ isKioskActive: true })
        .where(eq(photoQueueSessions.id, photoSessionId))
        .returning();
      return updated!;
    });
    this.realtime.photoQueueChanged({
      photoSessionIds: [photoSessionId],
      sessionsChanged: true,
      activeSessionChanged: true,
    });
    return result;
  }

  async requestNumber(studentCode: string, actor: ActorContext) {
    const normalizedStudentCode = studentCode.trim().toLowerCase();
    if (!normalizedStudentCode) throw new BadRequestException('Vui lòng nhập MSSV.');

    const result = await this.database.transaction(async (transaction) => {
      const [activePhotoSession] = await transaction
        .select({ id: photoQueueSessions.id })
        .from(photoQueueSessions)
        .where(and(eq(photoQueueSessions.isActive, true), eq(photoQueueSessions.isKioskActive, true)))
        .limit(1)
        .for('update');
      if (!activePhotoSession) {
        throw new BadRequestException('Kiosk chưa có phiên chụp ảnh đang hoạt động.');
      }
      const photoSessionId = activePhotoSession.id;
      await this.ensurePhotoSession(transaction, photoSessionId);

      const [bachelor] = await transaction
        .select()
        .from(bachelors)
        .where(sql`lower(${bachelors.studentCode}) = ${normalizedStudentCode}`)
        .limit(1)
        .for('update');
      if (!bachelor) throw new BadRequestException('Không tìm thấy tân cử nhân trong hệ thống.');
      const [assignment] = await transaction
        .select()
        .from(photoQueueAssignments)
        .where(eq(photoQueueAssignments.bachelorId, bachelor.id))
        .limit(1);
      if (
        !assignment ||
        assignment.photoSessionId !== photoSessionId ||
        assignment.requiresCoordinator
      ) {
        throw new BadRequestException(
          'Bạn chưa đến phiên hoặc trễ phiên, vui lòng tới bàn điều phối để lấy số.',
        );
      }

      return this.issueNumber(transaction, bachelor, photoSessionId, 'KIOSK', actor);
    });
    this.realtime.photoQueueChanged({ photoSessionIds: [result.photoSessionId] });
    return result;
  }

  async kioskLookup(studentCode: string) {
    const normalizedStudentCode = studentCode.trim().toLowerCase();
    if (!normalizedStudentCode) throw new BadRequestException('Vui lòng nhập MSSV.');

    const activePhotoSessionId = await this.getActivePhotoSessionId();
    const [row] = await this.database
      .select({
        id: bachelors.id,
        studentCode: bachelors.studentCode,
        fullName: bachelors.fullName,
        major: bachelors.major,
        photoSessionId: photoQueueAssignments.photoSessionId,
        requiresCoordinator: photoQueueAssignments.requiresCoordinator,
        existingQueueNumber: photoQueueEntries.queueNumber,
      })
      .from(bachelors)
      .leftJoin(photoQueueAssignments, eq(photoQueueAssignments.bachelorId, bachelors.id))
      .leftJoin(
        photoQueueEntries,
        and(
          eq(photoQueueEntries.bachelorId, bachelors.id),
          eq(photoQueueEntries.photoSessionId, activePhotoSessionId),
          sql`${photoQueueEntries.photoStatus} <> ${CANCELLED}`,
        ),
      )
      .where(sql`lower(${bachelors.studentCode}) = ${normalizedStudentCode}`)
      .limit(1);

    if (
      !row ||
      row.photoSessionId !== activePhotoSessionId ||
      row.requiresCoordinator
    ) {
      throw new BadRequestException(
        'Bạn chưa đến phiên hoặc trễ phiên, vui lòng tới bàn điều phối để lấy số.',
      );
    }

    return {
      studentCode: row.studentCode,
      fullName: row.fullName,
      major: row.major,
      photoSessionId: activePhotoSessionId,
      existingQueueNumber: row.existingQueueNumber,
    };
  }

  async lookupBachelor(studentCode: string) {
    const normalizedStudentCode = studentCode.trim().toLowerCase();
    const [row] = await this.database
      .select({
        id: bachelors.id,
        studentCode: bachelors.studentCode,
        fullName: bachelors.fullName,
        major: bachelors.major,
        assignedPhotoSessionId: photoQueueAssignments.photoSessionId,
        requiresCoordinator: photoQueueAssignments.requiresCoordinator,
        note: photoQueueAssignments.note,
      })
      .from(bachelors)
      .leftJoin(photoQueueAssignments, eq(photoQueueAssignments.bachelorId, bachelors.id))
      .where(sql`lower(${bachelors.studentCode}) = ${normalizedStudentCode}`)
      .limit(1);
    if (!row) throw new BadRequestException('Không tìm thấy tân cử nhân trong hệ thống.');
    return row;
  }

  async coordinatorIssueNumber(
    studentCode: string,
    photoSessionId: number,
    reason: string,
    actor: ActorContext,
  ) {
    if (!reason.trim()) throw new BadRequestException('Vui lòng nhập lý do chuyển phiên.');

    const result = await this.database.transaction(async (transaction) => {
      await this.ensurePhotoSession(transaction, photoSessionId);
      const [bachelor] = await transaction
        .select()
        .from(bachelors)
        .where(sql`lower(${bachelors.studentCode}) = ${studentCode.trim().toLowerCase()}`)
        .limit(1)
        .for('update');
      if (!bachelor) throw new BadRequestException('Không tìm thấy tân cử nhân trong hệ thống.');

      const [existing] = await transaction
        .select({
          id: photoQueueEntries.id,
          queueNumber: photoQueueEntries.queueNumber,
        })
        .from(photoQueueEntries)
        .where(
          and(
            eq(photoQueueEntries.bachelorId, bachelor.id),
            eq(photoQueueEntries.photoSessionId, photoSessionId),
            sql`${photoQueueEntries.photoStatus} <> ${CANCELLED}`,
          ),
        )
        .limit(1)
        .for('update');
      if (existing) {
        await transaction
          .update(photoQueueEntries)
          .set({ photoStatus: CANCELLED })
          .where(eq(photoQueueEntries.id, existing.id));
        await transaction.insert(photoQueueAuditLogs).values({
          photoSessionId,
          action: 'coordinator-cancel-reissue',
          previousNumber: existing.queueNumber,
          actorId: actor.userId,
          actorName: actor.fullName || actor.email,
          details: `${actor.fullName || actor.email} đã hủy số ${existing.queueNumber} của ${bachelor.studentCode} ${bachelor.fullName} để cấp lại. Lý do: ${reason.trim()}.`,
        });
      }

      const entry = await this.issueNumber(
        transaction,
        bachelor,
        photoSessionId,
        'COORDINATOR',
        actor,
        reason.trim(),
      );
      await transaction.insert(photoQueueAuditLogs).values({
        photoSessionId,
        action: 'coordinator-issue',
        previousNumber: existing?.queueNumber,
        nextNumber: entry.queueNumber,
        actorId: actor.userId,
        actorName: actor.fullName || actor.email,
        details: getPhotoQueueAuditDetails({
          type: 'number-issued',
          source: 'COORDINATOR',
          actorName: actor.fullName || actor.email,
          studentCode: bachelor.studentCode,
          fullName: bachelor.fullName,
          queueNumber: entry.queueNumber,
          reason: reason.trim(),
        }),
      });
      return entry;
    });
    this.realtime.photoQueueChanged({ photoSessionIds: [photoSessionId] });
    return result;
  }

  async uploadAssignments(rows: { photoSessionId: number; studentCode: string; requiresCoordinator?: boolean; note?: string }[]) {
    const result = await this.database.transaction(async (transaction) => {
      let imported = 0;
      for (const row of rows) {
        await this.ensurePhotoSession(transaction, row.photoSessionId);
        const [bachelor] = await transaction
          .select({ id: bachelors.id })
          .from(bachelors)
          .where(sql`lower(${bachelors.studentCode}) = ${row.studentCode.trim().toLowerCase()}`)
          .limit(1);
        if (!bachelor) continue;
        await transaction
          .insert(photoQueueAssignments)
          .values({
            bachelorId: bachelor.id,
            photoSessionId: row.photoSessionId,
            requiresCoordinator: row.requiresCoordinator ?? false,
            note: row.note?.trim() || null,
          })
          .onConflictDoUpdate({
            target: [photoQueueAssignments.bachelorId],
            set: {
              photoSessionId: row.photoSessionId,
              requiresCoordinator: row.requiresCoordinator ?? false,
              note: row.note?.trim() || null,
            },
          });
        imported += 1;
      }
      return { imported };
    });
    this.realtime.photoQueueChanged({
      photoSessionIds: [...new Set(rows.map((row) => row.photoSessionId))],
    });
    return result;
  }

  private async issueNumber(
    transaction: Transaction,
    bachelor: typeof bachelors.$inferSelect,
    photoSessionId: number,
    source: 'KIOSK' | 'COORDINATOR',
    actor: ActorContext,
    coordinatorReason?: string,
  ) {
    const [existing] = await transaction
        .select()
        .from(photoQueueEntries)
        .where(
          and(
            eq(photoQueueEntries.bachelorId, bachelor.id),
            eq(photoQueueEntries.photoSessionId, photoSessionId),
            sql`${photoQueueEntries.photoStatus} <> ${CANCELLED}`,
          ),
        )
        .limit(1);
    if (existing) {
      if (source === 'KIOSK') {
        throw new BadRequestException(
          `Bạn đã bốc số ${existing.queueNumber}. Vui lòng liên hệ bàn điều phối nếu cần bốc lại hoặc chuyển phiên.`,
        );
      }
      return this.entryResponse(existing, bachelor);
    }

    const [nextNumberRow] = await transaction
        .select({
          nextNumber: sql<number>`coalesce(max(${photoQueueEntries.queueNumber}), 0)::int + 1`,
        })
        .from(photoQueueEntries)
        .where(eq(photoQueueEntries.photoSessionId, photoSessionId));
    const nextNumber = nextNumberRow?.nextNumber ?? 1;

    const [entry] = await transaction
        .insert(photoQueueEntries)
        .values({
          bachelorId: bachelor.id,
          photoSessionId,
          queueNumber: nextNumber,
          photoStatus: WAITING,
          source,
          coordinatorReason,
        })
        .returning();

    if (source === 'KIOSK') {
      await transaction.insert(photoQueueAuditLogs).values({
        photoSessionId,
        action: 'student-request',
        nextNumber,
        actorId: actor.userId,
        actorName: actor.fullName || actor.email,
        details: getPhotoQueueAuditDetails({
          type: 'number-issued',
          source,
          studentCode: bachelor.studentCode,
          fullName: bachelor.fullName,
          queueNumber: nextNumber,
        }),
      });
    }

    return this.entryResponse(entry!, bachelor);
  }

  async publicState(photoSessionId?: number) {
    const effectivePhotoSessionId = photoSessionId ?? (await this.getActivePhotoSessionId());
    const state = await this.ensureState(effectivePhotoSessionId);
    const displayNumber = state.currentNumber > 0 ? state.currentNumber : 1;
    const [current] = await this.entryWithBachelor(effectivePhotoSessionId, displayNumber);
    const [next] = await this.nextWaitingEntryWithBachelor(
      effectivePhotoSessionId,
      displayNumber,
    );
    return {
      photoSessionId: effectivePhotoSessionId,
      currentNumber: current ? displayNumber : 0,
      currentPhotoConfirmed: state.currentPhotoConfirmed,
      currentPhotoTaken: state.currentPhotoTaken,
      current,
      next,
    };
  }

  async stats(photoSessionId: number) {
    const [summary] = await this.database
      .select({
        waiting: sql<number>`count(*) filter (where ${photoQueueEntries.photoStatus} = ${WAITING})::int`,
        photographed: sql<number>`count(*) filter (where ${photoQueueEntries.photoStatus} = ${PHOTOGRAPHED})::int`,
        absent: sql<number>`count(*) filter (where ${photoQueueEntries.photoStatus} = ${ABSENT})::int`,
        canceled: sql<number>`count(*) filter (where ${photoQueueEntries.photoStatus} = ${CANCELLED})::int`,
        total: count(photoQueueEntries.id),
      })
      .from(photoQueueEntries)
      .where(eq(photoQueueEntries.photoSessionId, photoSessionId));

    const entries = await this.database
      .select({
        queueNumber: photoQueueEntries.queueNumber,
        photoStatus: photoQueueEntries.photoStatus,
        studentCode: bachelors.studentCode,
        fullName: bachelors.fullName,
        major: bachelors.major,
      })
      .from(photoQueueEntries)
      .innerJoin(bachelors, eq(bachelors.id, photoQueueEntries.bachelorId))
      .where(eq(photoQueueEntries.photoSessionId, photoSessionId))
      .orderBy(asc(photoQueueEntries.queueNumber));

    return {
      summary: summary ?? { waiting: 0, photographed: 0, absent: 0, canceled: 0, total: 0 },
      entries,
    };
  }

  async auditLogs(photoSessionId: number, limit: number) {
    return this.database
      .select()
      .from(photoQueueAuditLogs)
      .where(eq(photoQueueAuditLogs.photoSessionId, photoSessionId))
      .orderBy(desc(photoQueueAuditLogs.createdAt))
      .limit(Math.min(limit, 200));
  }

  next(photoSessionId: number, actor: ActorContext) {
    return this.move(photoSessionId, actor, 'next');
  }

  async confirmCurrent(
    photoSessionId: number,
    input: ConfirmPhotoQueueCurrentDto,
    actor: ActorContext,
  ) {
    const retouchNoteImage1 = input.retouchNoteImage1?.trim() ?? '';
    const retouchNoteImage2 = input.retouchNoteImage2?.trim() ?? '';
    const notPhotographedReason = input.notPhotographedReason?.trim() ?? '';
    if (input.photographed && (!retouchNoteImage1 || !retouchNoteImage2)) {
      throw new BadRequestException('Vui lòng nhập ghi chú ảnh 1 và ảnh 2 cho design retouch.');
    }
    if (!input.photographed && !notPhotographedReason) {
      throw new BadRequestException('Vui lòng nhập lý do chưa chụp.');
    }

    const result = await this.database.transaction(async (transaction) => {
      const [state] = await transaction
        .select()
        .from(photoQueueStates)
        .where(eq(photoQueueStates.photoSessionId, photoSessionId))
        .limit(1)
        .for('update');
      if (!state || state.currentNumber <= 0) throw new BadRequestException('Chưa có số hiện tại để xác nhận.');
      const [currentBachelor] = await transaction
        .select({
          studentCode: bachelors.studentCode,
          fullName: bachelors.fullName,
        })
        .from(photoQueueEntries)
        .innerJoin(bachelors, eq(bachelors.id, photoQueueEntries.bachelorId))
        .where(
          and(
            eq(photoQueueEntries.photoSessionId, photoSessionId),
            eq(photoQueueEntries.queueNumber, state.currentNumber),
          ),
        )
        .limit(1);
      if (!currentBachelor) {
        throw new BadRequestException('Không tìm thấy tân cử nhân của số hiện tại.');
      }
      await transaction
        .update(photoQueueStates)
        .set({ currentPhotoConfirmed: true, currentPhotoTaken: input.photographed, updatedAt: sql`now()`, updatedBy: actor.userId })
        .where(eq(photoQueueStates.id, state.id));
      await transaction
        .update(photoQueueEntries)
        .set({
          photoStatus: input.photographed ? PHOTOGRAPHED : ABSENT,
          photographedAt: input.photographed ? sql`now()` : null,
          retouchNoteImage1: input.photographed ? retouchNoteImage1 : null,
          retouchNoteImage2: input.photographed ? retouchNoteImage2 : null,
        })
        .where(and(eq(photoQueueEntries.photoSessionId, photoSessionId), eq(photoQueueEntries.queueNumber, state.currentNumber)));
      await transaction.insert(photoQueueAuditLogs).values({
        photoSessionId,
        action: input.photographed ? 'confirm-photographed' : 'confirm-not-photographed',
        nextNumber: state.currentNumber,
        actorId: actor.userId,
        actorName: actor.fullName || actor.email,
        details: getPhotoQueueAuditDetails({
          type: 'photo-confirmed',
          actorName: actor.fullName || actor.email,
          studentCode: currentBachelor.studentCode,
          fullName: currentBachelor.fullName,
          photographed: input.photographed,
          retouchNoteImage1,
          retouchNoteImage2,
          notPhotographedReason,
        }),
      });
      return { photoSessionId, currentNumber: state.currentNumber, photographed: input.photographed };
    });
    this.realtime.photoQueueChanged({ photoSessionIds: [photoSessionId] });
    return result;
  }

  previous(photoSessionId: number, actor: ActorContext) {
    return this.move(photoSessionId, actor, 'previous');
  }

  setNumber(photoSessionId: number, queueNumber: number, actor: ActorContext) {
    return this.move(photoSessionId, actor, 'set', queueNumber);
  }

  private async move(
    photoSessionId: number,
    actor: ActorContext,
    action: 'next' | 'previous' | 'set',
    manualNumber?: number,
  ) {
    const result = await this.database.transaction(async (transaction) => {
      await this.ensurePhotoSession(transaction, photoSessionId);
      const [state] = await transaction
        .insert(photoQueueStates)
        .values({ photoSessionId, currentNumber: 0, updatedBy: actor.userId })
        .onConflictDoUpdate({
          target: [photoQueueStates.photoSessionId],
          set: { updatedAt: sql`now()` },
        })
        .returning();

      const previousNumber = state!.currentNumber;
      if (action === 'next' && previousNumber > 0 && !state!.currentPhotoConfirmed) {
        throw new BadRequestException('Vui lòng xác nhận tân cử nhân hiện tại đã chụp hay chưa trước khi bấm Next.');
      }
      const previousWaitingNumber =
        action === 'previous'
          ? await this.findPreviousWaitingNumber(transaction, photoSessionId, previousNumber)
          : null;
      const nextWaitingNumber =
        action === 'next'
          ? await this.findNextWaitingNumber(
              transaction,
              photoSessionId,
              state!.manualReturnNumber ?? previousNumber,
            )
          : null;
      if (action === 'previous' && previousWaitingNumber === null) {
        throw new BadRequestException('Không có số phía trước chưa chụp để quay lại.');
      }
      if (action === 'next' && nextWaitingNumber === null) {
        throw new BadRequestException('Không có số tiếp theo chưa chụp để chuyển tới.');
      }
      const nextNumber =
        action === 'set'
          ? manualNumber!
          : action === 'previous'
            ? previousWaitingNumber!
            : nextWaitingNumber!;

      const [updated] = await transaction
        .update(photoQueueStates)
        .set({
          currentNumber: nextNumber,
          currentPhotoConfirmed: false,
          currentPhotoTaken: null,
          manualReturnNumber: action === 'set' ? previousNumber : null,
          updatedAt: sql`now()`,
          updatedBy: actor.userId,
        })
        .where(eq(photoQueueStates.id, state!.id))
        .returning();

      await transaction.insert(photoQueueAuditLogs).values({
        photoSessionId,
        action,
        previousNumber,
        nextNumber,
        actorId: actor.userId,
        actorName: actor.fullName || actor.email,
        details:
          action === 'set'
            ? `${actor.fullName || actor.email} đã chuyển thủ công từ số ${previousNumber} sang số ${nextNumber}.`
            : action === 'previous'
              ? `${actor.fullName || actor.email} đã quay lại từ số ${previousNumber} về số ${nextNumber}.`
              : `${actor.fullName || actor.email} đã chuyển từ số ${previousNumber} sang số ${nextNumber}.`,
      });

      return {
        photoSessionId,
        previousNumber,
        currentNumber: updated!.currentNumber,
        canControl: actor.permissions.includes(Permission.ControlPhotoQueue),
      };
    });
    this.realtime.photoQueueChanged({ photoSessionIds: [photoSessionId] });
    return result;
  }

  private ensureState(photoSessionId: number) {
    return this.database.transaction(async (transaction) => {
      const [state] = await transaction
        .insert(photoQueueStates)
        .values({ photoSessionId, currentNumber: 0 })
        .onConflictDoUpdate({
          target: [photoQueueStates.photoSessionId],
          set: { updatedAt: sql`now()` },
        })
        .returning();
      return state!;
    });
  }

  private entryWithBachelor(photoSessionId: number, queueNumber: number) {
    return this.database
      .select({
        queueNumber: photoQueueEntries.queueNumber,
        photoStatus: photoQueueEntries.photoStatus,
        studentCode: bachelors.studentCode,
        fullName: bachelors.fullName,
        major: bachelors.major,
        image: bachelors.image,
      })
      .from(photoQueueEntries)
      .innerJoin(bachelors, eq(bachelors.id, photoQueueEntries.bachelorId))
      .where(
        and(
          eq(photoQueueEntries.photoSessionId, photoSessionId),
          eq(photoQueueEntries.queueNumber, queueNumber),
        ),
      )
      .limit(1);
  }

  private nextWaitingEntryWithBachelor(photoSessionId: number, currentNumber: number) {
    return this.database
      .select({
        queueNumber: photoQueueEntries.queueNumber,
        photoStatus: photoQueueEntries.photoStatus,
        studentCode: bachelors.studentCode,
        fullName: bachelors.fullName,
        major: bachelors.major,
        image: bachelors.image,
      })
      .from(photoQueueEntries)
      .innerJoin(bachelors, eq(bachelors.id, photoQueueEntries.bachelorId))
      .where(
        and(
          eq(photoQueueEntries.photoSessionId, photoSessionId),
          eq(photoQueueEntries.photoStatus, WAITING),
          sql`${photoQueueEntries.queueNumber} > ${currentNumber}`,
        ),
      )
      .orderBy(asc(photoQueueEntries.queueNumber))
      .limit(1);
  }

  private async findNextWaitingNumber(
    transaction: Transaction,
    photoSessionId: number,
    currentNumber: number,
  ) {
    const [entry] = await transaction
      .select({ queueNumber: photoQueueEntries.queueNumber })
      .from(photoQueueEntries)
      .where(
        and(
          eq(photoQueueEntries.photoSessionId, photoSessionId),
          eq(photoQueueEntries.photoStatus, WAITING),
          sql`${photoQueueEntries.queueNumber} > ${currentNumber}`,
        ),
      )
      .orderBy(asc(photoQueueEntries.queueNumber))
      .limit(1)
      .for('update');
    return entry?.queueNumber ?? null;
  }

  private async findPreviousWaitingNumber(
    transaction: Transaction,
    photoSessionId: number,
    currentNumber: number,
  ) {
    if (currentNumber <= 1) return null;
    const [entry] = await transaction
      .select({ queueNumber: photoQueueEntries.queueNumber })
      .from(photoQueueEntries)
      .where(
        and(
          eq(photoQueueEntries.photoSessionId, photoSessionId),
          eq(photoQueueEntries.photoStatus, WAITING),
          sql`${photoQueueEntries.queueNumber} < ${currentNumber}`,
        ),
      )
      .orderBy(desc(photoQueueEntries.queueNumber))
      .limit(1)
      .for('update');
    return entry?.queueNumber ?? null;
  }

  private entryResponse(
    entry: typeof photoQueueEntries.$inferSelect,
    bachelor: typeof bachelors.$inferSelect,
  ) {
    return {
      queueNumber: entry.queueNumber,
      photoStatus: entry.photoStatus,
      photoSessionId: entry.photoSessionId,
      studentCode: bachelor.studentCode,
      fullName: bachelor.fullName,
      major: bachelor.major,
      requestedAt: entry.requestedAt,
    };
  }

  private async ensurePhotoSession(transaction: Transaction, photoSessionId: number) {
    const [photoSession] = await transaction
      .select({ id: photoQueueSessions.id })
      .from(photoQueueSessions)
      .where(and(eq(photoQueueSessions.id, photoSessionId), eq(photoQueueSessions.isActive, true)))
      .limit(1);
    if (!photoSession) throw new BadRequestException('Phiên chụp ảnh không tồn tại hoặc đã đóng.');
  }

  private async getActivePhotoSessionId() {
    const [session] = await this.database
      .select({ id: photoQueueSessions.id })
      .from(photoQueueSessions)
      .where(and(eq(photoQueueSessions.isActive, true), eq(photoQueueSessions.isKioskActive, true)))
      .limit(1);
    if (!session) throw new BadRequestException('Chưa có phiên chụp ảnh đang hoạt động.');
    return session.id;
  }
}
