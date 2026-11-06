'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sessionKey } from '@/features/auth/queries/session-provider';
import { createCoalescer, queryKeysForTopics } from '@/lib/realtime/data-signals';
import {
  isServerInitiatedDisconnect,
  isUnauthorizedConnectError,
  reconnectAfterServerDisconnect,
} from '@/lib/realtime/reconnect';
import { setRealtimeConnected } from '@/lib/realtime/realtime-status';
import { useRealtime } from '@/lib/realtime/use-realtime';
import toast from '@/lib/toast';

/** Gom các sự kiện trong khoảng này (cộng ngẫu nhiên thêm tới JITTER) rồi mới tải lại, để đợt check-in đông không dồn tải. */
const COALESCE_MS = 400;
const JITTER_MS = 300;

/**
 * Nhịp sống: tab còn mở thì cứ chừng này lại hỏi phiên một lần để phiên được gia hạn (phiên hết sau 8 giờ, gia hạn mỗi khi
 * có request sau 1 giờ). Từ khi các trang bỏ poll, màn chỉ xem không còn request nền nào giữ phiên, nên cần nhịp này.
 */
const KEEP_ALIVE_MS = 30 * 60_000;
/** Máy ngủ dậy hoặc quay lại tab sau thời gian dài thì hỏi phiên ngay thay vì đợi nhịp sau. */
const WAKE_PING_AFTER_MS = 10 * 60_000;

const SESSION_LOST_MESSAGE = 'Phiên đăng nhập đã hết hạn hoặc quyền đã thay đổi. Vui lòng đăng nhập lại.';

type DataChangedEvent = { data?: { topics?: string[] } };
type AuthorizationError = { code?: string; message?: string };

/** Hỏi lại phiên (có tác dụng gia hạn). Hết phiên thì dữ liệu phiên thành null và lớp chặn đăng nhập đưa về trang đăng nhập. */
function useSessionKeepAlive() {
  const queryClient = useQueryClient();
  const lastPing = useRef(Date.now());

  useEffect(() => {
    const ping = () => {
      lastPing.current = Date.now();
      void queryClient.invalidateQueries({ queryKey: sessionKey });
    };
    const timer = window.setInterval(ping, KEEP_ALIVE_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastPing.current > WAKE_PING_AFTER_MS) ping();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [queryClient]);
}

/**
 * Thay cho việc hỏi API liên tục: backend báo `data:changed` khi dữ liệu đổi thì chỉ tải lại đúng các truy vấn liên quan.
 * Websocket đang nối thì các truy vấn không poll (xem `fallbackInterval`); mất kết nối thì poll dự phòng như trước,
 * và khi trạng thái đổi (mất hoặc có lại kết nối) thì tải lại các truy vấn đang mở để bù sự kiện bị lỡ.
 * Ngoài ra: giữ phiên sống, và xử lý khi server ngắt kết nối vì hết phiên hoặc đổi quyền.
 */
export function useDataSignals() {
  const queryClient = useQueryClient();
  const { connection, isConnected, startConnection } = useRealtime({ endpoint: '/events' });
  const previous = useRef<boolean | null>(null);
  const startConnectionRef = useRef(startConnection);
  startConnectionRef.current = startConnection;

  useSessionKeepAlive();

  useEffect(() => {
    setRealtimeConnected(isConnected);
    // Lần đầu chưa có gì để bù. Từ lần sau, mỗi lần đổi trạng thái thì tải lại để áp dụng poll dự phòng hoặc bù sự kiện lỡ.
    if (previous.current !== null && previous.current !== isConnected) {
      void queryClient.invalidateQueries({ type: 'active' });
    }
    previous.current = isConnected;
  }, [isConnected, queryClient]);

  useEffect(() => {
    if (!connection) return;
    const coalescer = createCoalescer<string[]>(
      (batches) => {
        for (const queryKey of queryKeysForTopics(batches.flat())) {
          void queryClient.invalidateQueries({ queryKey: [...queryKey] });
        }
      },
      COALESCE_MS,
      JITTER_MS,
    );
    const handler = (event: DataChangedEvent) => coalescer.push(event?.data?.topics ?? []);
    connection.on('data:changed', handler);
    return () => {
      connection.off('data:changed', handler);
      coalescer.cancel();
    };
  }, [connection, queryClient]);

  // Hết phiên, đổi quyền, bị khóa: server báo rồi ngắt. Hỏi lại phiên: mất thì về đăng nhập (kèm trang đang xem), còn thì nối lại.
  useEffect(() => {
    if (!connection) return;
    const socket = connection.socket;
    let reconnecting = false;
    let notified = false;

    const notifySessionLost = () => {
      if (notified) return;
      notified = true;
      toast.error(SESSION_LOST_MESSAGE, { duration: 8000, position: 'top-right' });
    };

    /** true nếu phiên còn hợp lệ. Khi mất phiên, dữ liệu phiên thành null và lớp chặn đăng nhập tự chuyển trang. */
    const refreshSession = async () => {
      await queryClient.refetchQueries({ queryKey: sessionKey });
      return queryClient.getQueryData(sessionKey) != null;
    };

    const recover = async () => {
      if (reconnecting) return;
      reconnecting = true;
      try {
        const outcome = await reconnectAfterServerDisconnect({
          refreshSession,
          connect: () => startConnectionRef.current(),
          wait: (ms) => new Promise((resolve) => window.setTimeout(resolve, ms)),
        });
        if (outcome === 'session-lost') notifySessionLost();
      } finally {
        reconnecting = false;
      }
    };

    const onDisconnect = (reason: string) => {
      if (isServerInitiatedDisconnect(reason)) void recover();
    };
    const onConnectError = (error: Error & { data?: { code?: string } }) => {
      // Nối lại bị từ chối vì phiên không còn hợp lệ: hỏi lại phiên để lớp chặn đăng nhập đưa về trang đăng nhập.
      if (isUnauthorizedConnectError(error) && !reconnecting) {
        void refreshSession().then((valid) => {
          if (!valid) notifySessionLost();
        });
      }
    };
    const onAuthorizationError = (error: AuthorizationError) => {
      toast.error(error?.message ?? SESSION_LOST_MESSAGE, { duration: 8000, position: 'top-right' });
      notified = true;
    };

    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    connection.on('authorization:error', onAuthorizationError);
    return () => {
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      connection.off('authorization:error', onAuthorizationError);
    };
  }, [connection, queryClient]);
}

/** Gắn một lần trong layout đã đăng nhập; không hiển thị gì. */
export function DataSignals() {
  useDataSignals();
  return null;
}
