// 'use client'; // Không cần thiết nếu chỉ là hook logic

import { ledAPI } from '@/config/axios';
import { Bachelor } from '@/dtos/BachelorDTO';
import { useSignalR } from '@/hooks/useSignalR'; // Assuming you already have this hook
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useMemo } from 'react';

// Định nghĩa kiểu dữ liệu cho return value của hook
interface UseBachelorDataResult {
  bachelorCurrent: Bachelor | null;
  isFetchingCurrent: boolean;
  isConnected: boolean;
  connectionState: string;
}

/**
 * Custom hook để quản lý dữ liệu cử nhân hiện tại (từ REST API và SignalR).
 * @param hall - ID của hall được chọn.
 * @param session - ID của session được chọn.
 * @returns Đối tượng chứa dữ liệu cử nhân hiện tại và trạng thái.
 */
export function useBachelorData(
  hall: string,
  session: string
): UseBachelorDataResult {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ['bachelorCurrent', hall, session],
    [hall, session]
  );

  // 1. SignalR setup
  const { connection, isConnected, connectionState, startConnection } =
    useSignalR({
      hubUrl: process.env.NEXT_PUBLIC_SIGNALR_URL?.toString() || '',
      autoConnect: false,
      forceWebsockets: true,
      onConnectionStateChange: (s) => {
        // console.log('[SignalR] state:', s);
      },
    });

  // Tự động kết nối SignalR khi component mount
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SIGNALR_URL;
    if (!url) return;
    let mounted = true;
    (async () => {
      if (mounted) await startConnection();
    })();
    // LƯU Ý: Không stopConnection ở đây nếu muốn giữ kết nối cho toàn bộ ứng dụng
    return () => {
      mounted = false;
    };
  }, [startConnection]);

  // 2. Fetch data ban đầu (Initial & khi hall/session thay đổi)
  const { data: bachelorCurrentData, isFetching: isFetchingCurrent } = useQuery(
    {
      queryKey,
      queryFn: async () => {
        const res = await ledAPI.getBachelorCurrent(hall, session);
        return res?.data?.data?.bachelor2 ?? null; // Chỉ lấy trực tiếp đối tượng bachelor
      },
      enabled: Boolean(hall && session),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    }
  );

  const [bachelorCurrent, setBachelorCurrent] = useState<Bachelor | null>(
    bachelorCurrentData ?? null
  );

  useEffect(() => {
    setBachelorCurrent(bachelorCurrentData ?? null);
  }, [bachelorCurrentData]);

  // 3. SignalR handler (Cập nhật dữ liệu từ realtime)
  useEffect(() => {
    if (!connection) return;

    const handler = (message: string) => {
      const cleaned = message.replace(/^CurrentBachelor\s*/, '').trim();
      // Xử lý các escape quotes và dấu phẩy thừa ở cuối (tuỳ thuộc vào định dạng server gửi)
      const normalized = cleaned.replace(/\\?"/g, '"').replace(/,? *\}$/, '}');

      try {
        const parsed = JSON.parse(normalized);
        const bachelorData: Bachelor = {
          image: parsed.Image,
          fullName: parsed.FullName,
          major: parsed.Major,
          studentCode: parsed.StudentCode,
          mail: parsed.Mail,
          hallName: parsed.HallName,
          sessionNum: parsed.SessionNum,
          chair: parsed.Chair ?? null,
          chairParent: parsed.ChairParent ?? null,
        };

        // Kiểm tra đúng hall/session trước khi cập nhật
        if (
          String(bachelorData.hallName) === String(hall) &&
          String(bachelorData.sessionNum) === String(session) &&
          bachelorData.image
        ) {
          // Cập nhật state nội bộ và cache của react-query
          setBachelorCurrent(bachelorData);

          queryClient.setQueryData(queryKey, (old: any) => {
            // Tránh re-render không cần thiết
            if (JSON.stringify(old) === JSON.stringify(bachelorData))
              return old;
            return bachelorData;
          });
        }
      } catch (e) {
        console.error('Error parsing SignalR payload', e, { message });
      }
    };

    connection.on('SendMessage', handler);
    return () => {
      connection.off('SendMessage', handler);
    };
  }, [connection, hall, session, queryClient, queryKey]);

  return {
    bachelorCurrent,
    isFetchingCurrent,
    isConnected,
    connectionState,
  };
}
