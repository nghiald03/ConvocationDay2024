// src/hooks/useRealtimeSession.ts

import { useSignalR } from '@/lib/realtime/use-signal-r';
import { useEffect, useState } from 'react';

/**
 * Hook để lấy Session ID hiện tại đang hoạt động thông qua SignalR.
 */
export function useRealtimeSession() {
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [isSessionReady, setIsSessionReady] = useState(false);

  // Khởi tạo SignalR (chỉ cần kết nối 1 lần)
  const { connection, startConnection } = useSignalR({
    hubUrl: '/backend-hub',
    autoConnect: false,
    forceWebsockets: true,
  });

  // Tự động kết nối
  useEffect(() => {
    startConnection();
  }, [startConnection]);

  // Lắng nghe SignalR để trích xuất Session ID
  useEffect(() => {
    if (!connection) return;

    const handler = (message: string) => {
      // Logic parsing message tương tự
      const cleaned = message.replace(/^CurrentBachelor\s*/, '').trim();
      const normalized = cleaned.replace(/\\?"/g, '"').replace(/,? *\}$/, '}');

      try {
        const parsed = JSON.parse(normalized);
        const newSessionId = String(parsed.SessionNum || ''); // Trích xuất SessionNum

        if (newSessionId && newSessionId !== currentSessionId) {
          // Cập nhật Session ID nếu có và khác Session cũ
          setCurrentSessionId(newSessionId);
          setIsSessionReady(true);
        }
      } catch (e) {
        // Bỏ qua lỗi parsing nếu không phải là message CurrentBachelor hợp lệ
        // console.error('Error parsing SignalR payload in useRealtimeSession', e, { message });
      }
    };

    connection.on('SendMessage', handler);
    return () => {
      connection.off('SendMessage', handler);
    };
  }, [connection, currentSessionId]); // Lắng nghe connection và currentSessionId

  return {
    currentSessionId,
    isSessionReady, // Flag cho biết đã nhận được Session ID lần đầu tiên
  };
}
