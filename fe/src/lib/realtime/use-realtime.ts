'use client';

import { io, type Socket } from 'socket.io-client';
import { useCallback, useEffect, useRef, useState } from 'react';

export type RealtimeState = 'Disconnected' | 'Connecting' | 'Connected' | 'Reconnecting';

type Acknowledgement = { ok: boolean; message?: string };

export class RealtimeConnection {
  constructor(readonly socket: Socket) {}

  on<T>(event: string, handler: (data: T) => void): this {
    this.socket.on(event, handler);
    return this;
  }

  off<T>(event: string, handler: (data: T) => void): this {
    this.socket.off(event, handler);
    return this;
  }

  async send(_legacyCommand: string, methodName: string, data: unknown): Promise<void> {
    const event = methodName === 'ReceiveNotify' ? 'ReceiveNotify' : 'SendMessage';
    const result = await this.socket.timeout(10_000).emitWithAck('publish-domain-event', { event, data }) as Acknowledgement;
    if (!result.ok) throw new Error(result.message ?? 'Không thể gửi sự kiện realtime.');
  }
}

interface RegistryEntry {
  connection: RealtimeConnection;
  refs: number;
  stopTimer: ReturnType<typeof setTimeout> | null;
}

const registry = new Map<string, RegistryEntry>();

function getEntry(key: string): RegistryEntry {
  const existing = registry.get(key);
  if (existing) return existing;
  const socket = io('/events', {
    path: '/backend-events/socket.io',
    withCredentials: true,
    autoConnect: false,
    transports: ['websocket', 'polling'],
    reconnection: true,
  });
  const entry = { connection: new RealtimeConnection(socket), refs: 0, stopTimer: null };
  registry.set(key, entry);
  return entry;
}

interface UseRealtimeOptions<TBroadcast> {
  endpoint?: string;
  autoConnect?: boolean;
  onTTSBroadcast?: (data: TBroadcast) => void;
  onConnectionStateChange?: (state: RealtimeState) => void;
  stopDelayMs?: number;
}

export function useRealtime<TBroadcast = unknown>({
  endpoint = '/events',
  autoConnect = true,
  onTTSBroadcast,
  onConnectionStateChange,
  stopDelayMs = 3_000,
}: UseRealtimeOptions<TBroadcast> = {}) {
  const [connection, setConnection] = useState<RealtimeConnection | null>(null);
  const [connectionState, setConnectionState] = useState<RealtimeState>('Disconnected');
  const entryRef = useRef<RegistryEntry | null>(null);
  const stateCallbackRef = useRef(onConnectionStateChange);
  const broadcastCallbackRef = useRef(onTTSBroadcast);

  useEffect(() => { stateCallbackRef.current = onConnectionStateChange; }, [onConnectionStateChange]);
  useEffect(() => { broadcastCallbackRef.current = onTTSBroadcast; }, [onTTSBroadcast]);

  const updateState = useCallback((state: RealtimeState) => {
    setConnectionState(state);
    stateCallbackRef.current?.(state);
  }, []);

  const startConnection = useCallback(async (): Promise<boolean> => {
    const entry = entryRef.current ?? getEntry(endpoint);
    entryRef.current = entry;
    setConnection(entry.connection);
    const socket = entry.connection.socket;
    if (socket.connected) {
      updateState('Connected');
      return true;
    }
    updateState(socket.active ? 'Reconnecting' : 'Connecting');
    socket.connect();
    return new Promise<boolean>((resolve) => {
      const timeout = window.setTimeout(() => { cleanup(); resolve(false); }, 10_000);
      const connected = () => { cleanup(); updateState('Connected'); resolve(true); };
      const failed = () => { cleanup(); updateState('Disconnected'); resolve(false); };
      const cleanup = () => {
        window.clearTimeout(timeout);
        socket.off('connect', connected);
        socket.off('connect_error', failed);
      };
      socket.once('connect', connected);
      socket.once('connect_error', failed);
    });
  }, [endpoint, updateState]);

  useEffect(() => {
    if (!endpoint.trim()) return;
    const entry = getEntry(endpoint);
    const socket = entry.connection.socket;
    entryRef.current = entry;
    entry.refs += 1;
    setConnection(entry.connection);
    if (entry.stopTimer) {
      clearTimeout(entry.stopTimer);
      entry.stopTimer = null;
    }
    const connected = () => updateState('Connected');
    const reconnecting = () => updateState('Reconnecting');
    const disconnected = () => updateState(socket.active ? 'Reconnecting' : 'Disconnected');
    const broadcast = (data: TBroadcast) => broadcastCallbackRef.current?.(data);
    socket.on('connect', connected);
    socket.io.on('reconnect_attempt', reconnecting);
    socket.on('disconnect', disconnected);
    socket.on('ReceiveTTSBroadcast', broadcast);
    if (autoConnect) void startConnection();

    return () => {
      socket.off('connect', connected);
      socket.io.off('reconnect_attempt', reconnecting);
      socket.off('disconnect', disconnected);
      socket.off('ReceiveTTSBroadcast', broadcast);
      entry.refs -= 1;
      if (entry.refs <= 0) {
        entry.stopTimer = setTimeout(() => {
          if (entry.refs <= 0) {
            socket.disconnect();
            registry.delete(endpoint);
          }
        }, stopDelayMs);
      }
    };
  }, [autoConnect, endpoint, startConnection, stopDelayMs, updateState]);

  const stopConnection = useCallback(async () => {
    const entry = entryRef.current;
    if (!entry) return;
    entry.connection.socket.disconnect();
    registry.delete(endpoint);
    updateState('Disconnected');
  }, [endpoint, updateState]);

  const sendMessage = useCallback(async (methodName: string, data: unknown) => {
    const entry = entryRef.current ?? getEntry(endpoint);
    if (!entry.connection.socket.connected && !(await startConnection())) throw new Error('Không thể kết nối realtime.');
    await entry.connection.send('SendMessage', methodName, data);
  }, [endpoint, startConnection]);

  return {
    connection,
    connectionState,
    isConnected: connectionState === 'Connected',
    startConnection,
    stopConnection,
    joinNoticerGroup: async () => true,
    leaveNoticerGroup: async () => undefined,
    sendMessage,
  };
}
