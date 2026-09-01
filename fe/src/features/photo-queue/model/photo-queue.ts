export type PhotoQueueEntry = {
  queueNumber: number;
  photoStatus: 'WAITING' | 'PHOTOGRAPHED' | 'ABSENT' | 'CANCELLED';
  studentCode: string;
  fullName: string;
  major: string | null;
  image?: string | null;
};

export type PhotoQueueRequestResult = PhotoQueueEntry & {
  photoSessionId: number;
  requestedAt: string;
};

export type PhotoQueuePublicState = {
  photoSessionId: number;
  currentNumber: number;
  currentPhotoConfirmed: boolean;
  currentPhotoTaken: boolean | null;
  current: PhotoQueueEntry | null;
  next: PhotoQueueEntry | null;
};

export type PhotoQueueSession = {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
};

export type PhotoQueueAssignmentInput = {
  photoSessionId: number;
  studentCode: string;
  requiresCoordinator?: boolean;
  note?: string;
};

export type PhotoQueueBachelorLookup = {
  id: number;
  studentCode: string;
  fullName: string;
  major: string | null;
  assignedPhotoSessionId: number | null;
  requiresCoordinator: boolean | null;
  note: string | null;
};

export type PhotoQueueKioskLookup = {
  studentCode: string;
  fullName: string;
  major: string | null;
  photoSessionId: number;
  existingQueueNumber: number | null;
};

export type PhotoQueueStats = {
  summary: {
    waiting: number;
    photographed: number;
    absent: number;
    canceled: number;
    total: number;
  };
  entries: PhotoQueueEntry[];
};

export type PhotoQueueAuditLog = {
  id: number;
  photoSessionId: number;
  action: string;
  previousNumber: number | null;
  nextNumber: number | null;
  actorId: string | null;
  actorName: string | null;
  details: string | null;
  createdAt: string;
};
