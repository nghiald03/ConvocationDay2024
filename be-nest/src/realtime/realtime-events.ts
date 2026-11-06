export interface RealtimeEnvelope<T> {
  eventId: string;
  serverTimestamp: string;
  data: T;
}

export interface TtsBroadcast {
  notificationId: number;
  title: string;
  content: string;
  priority: number;
  priorityText: string;
  repeatCount: number;
  hallName: string | null;
  sessionNumber: number | null;
  scope: string;
  broadcastAt: string;
  isNewNotification?: boolean;
}

export interface PhotoQueueChanged {
  photoSessionIds: number[];
  sessionsChanged?: boolean;
  activeSessionChanged?: boolean;
}

/**
 * Chủ đề dữ liệu vừa đổi, để frontend chỉ tải lại phần liên quan thay vì hỏi liên tục:
 * - checkin: điểm danh, đóng/mở phiên, reset
 * - bachelor: danh sách tân cử nhân (thêm, sửa, xóa, import, chuyển phiên)
 * - led: người đang chiếu hoặc hàng đợi LED
 */
export type DataChangeTopic = 'checkin' | 'bachelor' | 'led';

/** Rỗng ở `hallIds` hoặc `sessionIds` nghĩa là không giới hạn phạm vi (có thể ảnh hưởng mọi side, mọi phiên). */
export interface DataChanged {
  topics: DataChangeTopic[];
  hallIds: number[];
  sessionIds: number[];
}

export interface ServerToClientEvents {
  SendMessage: (data: unknown) => void;
  ReceiveNotify: (data: unknown) => void;
  ReceiveTTSBroadcast: (data: TtsBroadcast) => void;
  'data:changed': (event: RealtimeEnvelope<DataChanged>) => void;
  'bachelor:changed': (event: RealtimeEnvelope<unknown>) => void;
  'hall-session:refresh': (event: RealtimeEnvelope<{ hallId?: number; sessionId?: number }>) => void;
  'notification:changed': (event: RealtimeEnvelope<{ notificationId: number; status: string }>) => void;
  'photo-queue:changed': (event: RealtimeEnvelope<PhotoQueueChanged>) => void;
  'authorization:error': (error: { code: string; message: string }) => void;
}

export interface ClientToServerEvents {
  'publish-domain-event': (
    command: { event: 'SendMessage' | 'ReceiveNotify'; data: unknown },
    acknowledge?: (result: { ok: boolean; message?: string }) => void,
  ) => void;
  'broadcast-tts': (
    command: TtsBroadcast,
    acknowledge?: (result: { ok: boolean; message?: string }) => void,
  ) => void;
}
