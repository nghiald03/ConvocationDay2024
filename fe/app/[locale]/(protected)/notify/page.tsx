// useSignalR.ts
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
} from '@microsoft/signalr';

interface UseSignalROptions {
  hubUrl: string;
  accessToken?: string;
  autoConnect?: boolean;
  onTTSBroadcast?: (data: any) => void;
  onConnectionStateChange?: (state: string) => void;
  /** Ép dùng WebSockets + skipNegotiation (server phải bật WS) */
  forceWebsockets?: boolean;
  /** Trì hoãn stop khi refCount=0 để né Strict Mode cleanup (ms). Mặc định 3000. */
  stopDelayMs?: number;
}

/** Registry singleton theo hubUrl để tránh tạo/stop chồng nhau (Strict Mode) */
type SRRegistryEntry = {
  conn: HubConnection;
  refCount: number;
  starting: boolean;
  joining: boolean;
  joined: boolean;
  stopTimer?: ReturnType<typeof setTimeout> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __SR_REG__: Record<string, SRRegistryEntry> | undefined;
}

const getRegistry = () => {
  if (!globalThis.__SR_REG__) globalThis.__SR_REG__ = {};
  return globalThis.__SR_REG__;
};

export const useSignalR = (options: UseSignalROptions) => {
  const {
    hubUrl,
    accessToken,
    autoConnect = true,
    onTTSBroadcast,
    onConnectionStateChange,
    forceWebsockets = false,
    stopDelayMs = 3000,
  } = options;

  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [connectionState, setConnectionState] =
    useState<string>('Disconnected');
  const [isConnected, setIsConnected] = useState(false);

  const registry = getRegistry();
  const entryRef = useRef<SRRegistryEntry | null>(null);

  const setStateSafe = (s: string) => {
    setConnectionState(s);
    onConnectionStateChange?.(s);
  };

  // Tạo (hoặc lấy) 1 connection duy nhất theo hubUrl
  const ensureEntry = useCallback(() => {
    let entry = registry[hubUrl];
    if (!entry) {
      const builder = new HubConnectionBuilder();

      const urlOpts: any = {
        accessTokenFactory: () => accessToken || '',
        withCredentials: false,
      };
      if (forceWebsockets) {
        // Bỏ negotiation phase nếu BE hỗ trợ WebSockets
        urlOpts.skipNegotiation = true;
        urlOpts.transport = HttpTransportType.WebSockets;
      }

      const conn = builder
        .withUrl(hubUrl, urlOpts)
        .withAutomaticReconnect()
        .build();

      entry = registry[hubUrl] = {
        conn,
        refCount: 0,
        starting: false,
        joining: false,
        joined: false,
        stopTimer: null,
      };

      // Lifecycle chung
      conn.onreconnecting((err) => {
        console.warn('[SignalR] Reconnecting...', err);
        entry!.joined = false;
        setStateSafe('Reconnecting');
        setIsConnected(false);
      });
      conn.onreconnected(() => {
        console.info('[SignalR] Reconnected');
        setStateSafe('Connected');
        setIsConnected(true);
        // tự join lại nhóm
        void joinNoticerGroupInternal(entry!);
      });
      conn.onclose((err) => {
        console.warn('[SignalR] Closed', err);
        entry!.joined = false;
        setStateSafe('Disconnected');
        setIsConnected(false);
      });

      // Event optional tuỳ BE
      if (onTTSBroadcast) {
        conn.on('ReceiveTTSBroadcast', (data) => {
          console.log('[SignalR] ReceiveTTSBroadcast:', data);
          onTTSBroadcast(data);
        });
      }

      // NOTE: Page/screen tự đăng ký ReceiveNotify riêng để quản lý lifecycle handler theo UI.
    }
    return entry;
  }, [registry, hubUrl, accessToken, forceWebsockets, onTTSBroadcast]);

  const waitForConnected = useCallback(
    async (entry: SRRegistryEntry, timeoutMs = 10000) => {
      const start = Date.now();
      while (entry.conn.state !== HubConnectionState.Connected) {
        if (Date.now() - start > timeoutMs) return false;
        await new Promise((r) => setTimeout(r, 80));
      }
      return true;
    },
    []
  );

  // ---- start/stop ---------------------------------------------------

  const startConnection = useCallback(async (): Promise<boolean> => {
    const entry = entryRef.current || ensureEntry();
    entryRef.current = entry;
    setConnection(entry.conn);

    // nếu đang có timer dừng do unmount trước đó → huỷ dừng
    if (entry.stopTimer) {
      clearTimeout(entry.stopTimer);
      entry.stopTimer = null;
    }

    // serialize start
    if (entry.starting) {
      console.log('[SignalR] start ignored: already starting...');
      const ok = await waitForConnected(entry);
      return ok;
    }
    if (
      entry.conn.state === HubConnectionState.Connected ||
      entry.conn.state === HubConnectionState.Connecting ||
      entry.conn.state === HubConnectionState.Reconnecting
    ) {
      console.log('[SignalR] start skipped: state =', entry.conn.state);
      const ok = await waitForConnected(entry);
      if (ok) {
        setStateSafe('Connected');
        setIsConnected(true);
      }
      return ok;
    }

    try {
      entry.starting = true;
      setStateSafe('Connecting');
      await entry.conn.start();
      setStateSafe('Connected');
      setIsConnected(true);
      console.info('[SignalR] Connected to', hubUrl);
      return true;
    } catch (err: any) {
      setStateSafe('Disconnected');
      setIsConnected(false);
      console.error('[SignalR] start failed:', err?.message || err);
      return false;
    } finally {
      entry.starting = false;
    }
  }, [ensureEntry, hubUrl, waitForConnected]);

  const immediateStop = useCallback(
    async (entry: SRRegistryEntry) => {
      // Đợi nếu đang start để tránh "stopped during negotiation"
      let spin = 0;
      while (entry.starting && spin < 50) {
        await new Promise((r) => setTimeout(r, 50));
        spin++;
      }
      try {
        if (
          entry.conn.state === HubConnectionState.Connected ||
          entry.conn.state === HubConnectionState.Reconnecting ||
          entry.conn.state === HubConnectionState.Connecting
        ) {
          await entry.conn.stop();
        }
      } catch (e) {
        console.warn('[SignalR] stop error:', e);
      } finally {
        setStateSafe('Disconnected');
        setIsConnected(false);
        delete registry[hubUrl];
      }
    },
    [hubUrl, registry, setStateSafe]
  );

  // ---- join/leave group (dùng send = Invocation type 1) --------------

  const joinNoticerGroupInternal = useCallback(
    async (entry: SRRegistryEntry) => {
      if (entry.joined || entry.joining) return;
      const ok = await waitForConnected(entry);
      if (!ok) {
        console.warn('[SignalR] join skipped: not connected');
        return;
      }
      try {
        entry.joining = true;
        await entry.conn.send('JoinNoticerGroup'); // fire-and-forget
        entry.joined = true;
        console.log('[SignalR] Joined Noticer group (send)');
      } catch (e) {
        entry.joined = false;
        console.error('[SignalR] JoinNoticerGroup failed:', e);
      } finally {
        entry.joining = false;
      }
    },
    [waitForConnected]
  );

  const joinNoticerGroup = useCallback(async () => {
    const entry = entryRef.current || ensureEntry();
    entryRef.current = entry;
    return joinNoticerGroupInternal(entry);
  }, [ensureEntry, joinNoticerGroupInternal]);

  const leaveNoticerGroup = useCallback(async () => {
    const entry = entryRef.current || ensureEntry();
    entryRef.current = entry;
    const ok = await waitForConnected(entry);
    if (!ok) return;
    try {
      await entry.conn.send('LeaveNoticerGroup'); // fire-and-forget
      entry.joined = false;
      console.log('[SignalR] Left Noticer group (send)');
    } catch (e) {
      console.error('[SignalR] LeaveNoticerGroup failed:', e);
    }
  }, [ensureEntry, waitForConnected]);

  // ---- generic send message (tuỳ BE) --------------------------------

  const sendMessage = useCallback(
    async (methodName: string, data: any) => {
      const entry = entryRef.current || ensureEntry();
      entryRef.current = entry;
      const ok = await waitForConnected(entry);
      if (!ok) throw new Error('SignalR: not connected');
      // Tuỳ BE: nếu hub có method "SendMessage(methodName, data)" (fire-and-forget)
      return entry.conn.send('SendMessage', methodName, data);
    },
    [ensureEntry, waitForConnected]
  );

  // ---- mount/unmount quản lý refCount & cleanup an toàn --------------

  useEffect(() => {
    const entry = ensureEntry();
    entryRef.current = entry;
    entry.refCount += 1;
    setConnection(entry.conn);

    // Nếu có stopTimer pending do unmount trước → huỷ (vì đã mount lại)
    if (entry.stopTimer) {
      clearTimeout(entry.stopTimer);
      entry.stopTimer = null;
    }

    if (autoConnect) {
      (async () => {
        const ok = await startConnection();
        if (ok) {
          await joinNoticerGroupInternal(entry);
        }
      })();
    }

    return () => {
      // Strict Mode dev sẽ chạy cleanup ngay rồi mount lại → dùng debounce stop
      entry.refCount -= 1;

      if (entry.refCount <= 0) {
        if (entry.stopTimer) {
          clearTimeout(entry.stopTimer);
        }
        entry.stopTimer = setTimeout(() => {
          // Nếu trong khoảng delay có component khác mount → refCount > 0 → không stop
          if (entry.refCount <= 0) {
            void immediateStop(entry);
          }
        }, stopDelayMs);
      }
      // else: vẫn còn nơi khác đang dùng connection → không stop
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubUrl, accessToken, autoConnect, forceWebsockets, stopDelayMs]);

  return {
    connection,
    connectionState,
    isConnected,
    startConnection,
    stopConnection: async () => {
      const entry = entryRef.current;
      if (!entry) return;
      if (entry.stopTimer) {
        clearTimeout(entry.stopTimer);
        entry.stopTimer = null;
      }
      await immediateStop(entry);
    },
    joinNoticerGroup,
    leaveNoticerGroup,
    sendMessage,
  };
};
