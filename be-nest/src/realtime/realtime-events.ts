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

export interface ServerToClientEvents {
  SendMessage: (data: unknown) => void;
  ReceiveNotify: (data: unknown) => void;
  ReceiveTTSBroadcast: (data: TtsBroadcast) => void;
  'bachelor:changed': (event: RealtimeEnvelope<unknown>) => void;
  'hall-session:refresh': (event: RealtimeEnvelope<{ hallId?: number; sessionId?: number }>) => void;
  'notification:changed': (event: RealtimeEnvelope<{ notificationId: number; status: string }>) => void;
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
