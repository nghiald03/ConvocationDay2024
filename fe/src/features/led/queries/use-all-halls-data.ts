// src/hooks/useAllHallsData.ts

import { getCurrentLedBachelors } from '@/features/led/api/get-led-bachelors';
import { hallQueryOptions } from '@/features/hall/queries/hall-query-options';
import { Bachelor } from '@/features/bachelor/model/bachelor';
import { useSignalR } from '@/lib/realtime/use-signal-r';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { useMemo, useEffect } from 'react';

// --- Interfaces (Giữ nguyên) ---
interface HallInfo {
  hallId: string;
  hallName: string;
}

interface UseAllHallsDataResult {
  allHallsData: {
    hallInfo: HallInfo;
    bachelor: Bachelor | null;
    isFetching: boolean;
  }[];
  isFetchingAny: boolean;
  isConnected: boolean;
  hallListLoading: boolean;
}

// --- Keys cho React Query ---
const getLatestSessionKey = (hallId: string) => ['latestSignalSession', hallId];
const getCurrentDataKey = (hallId: string) => ['bachelorCurrent', hallId]; // Key cho dữ liệu cử nhân hiện tại

/**
 * Hook theo dõi dữ liệu cử nhân hiện tại cho TẤT CẢ các Hall.
 * SignalR đóng vai trò là trigger, cung cấp dữ liệu tức thời và kích hoạt fetch API nền.
 */
export function useAllHallsData(): UseAllHallsDataResult {
  const queryClient = useQueryClient(); // 1. Fetch Danh sách Hall từ API

  const { data: hallListRes, isLoading: hallListLoading } = useQuery({
    ...hallQueryOptions,
    select: (halls): HallInfo[] =>
      halls.map((hall) => ({
        hallId: String(hall.hallId),
        hallName: hall.hallName,
      })),
  });

  const ALL_HALLS = useMemo(() => hallListRes || [], [hallListRes]); // --- SignalR Connection ---

  const { connection, isConnected, startConnection } = useSignalR({
    hubUrl: '/backend-hub',
    autoConnect: false,
    forceWebsockets: true,
  });

  useEffect(() => {
    startConnection();
  }, [startConnection]); // ------------------------- // 2. Setup SignalR handler (Cập nhật Cache TRỰC TIẾP & Kích hoạt Fetch NGẦM)
  useEffect(() => {
    if (!connection || ALL_HALLS.length === 0) return;

    const handler = (message: string) => {
      // Kiểm tra message phải là 'CurrentBachelor' và có nội dung
      if (!message || !message.includes('CurrentBachelor')) {
        return;
      }

      const cleaned = message.replace(/^CurrentBachelor\s*/, '').trim();
      const normalized = cleaned.replace(/\\?"/g, '"').replace(/,? *\}$/, '}');

      try {
        const parsed = JSON.parse(normalized);
        const {
          HallName: hallName,
          SessionNum: sessionNum,
          Image: image,
          StudentCode: studentCode,
        } = parsed; // Dùng Hall ID (từ list) để so sánh với HallName (chứa Hall ID) từ SignalR

        const targetHall = ALL_HALLS.find(
          (h) => String(h.hallId) === String(hallName)
        );

        if (targetHall) {
          const hallId = targetHall.hallId;
          const currentDataKey = getCurrentDataKey(hallId); // Map payload thành đối tượng Bachelor đầy đủ (Dùng làm dữ liệu cache tức thì)
          console.log(
            'SignalR payload parsed in useAllHallsData:',
            currentDataKey
          );
          const bachelorData: Bachelor = {
            image: parsed.Image,
            fullName: parsed.FullName,
            major: parsed.Major,
            studentCode: parsed.StudentCode,
            mail: parsed.Mail,
            hallName: parsed.HallName,
            sessionNum: parsed.SessionNum,
            sessionInDay: parsed.SessionInDay ?? null,
            chair: parsed.Chair ?? null,
            chairParent: parsed.ChairParent ?? null,
          };

          // B. Cập nhật Cache TRỰC TIẾP (Instant UI update)
          if (image && studentCode) {
            // Lấy dữ liệu cũ để so sánh
            const oldData = queryClient.getQueryData(currentDataKey) as any;
            const oldBachelor = oldData?.bachelor2 || oldData;

            // Nếu dữ liệu hoàn toàn giống nhau -> không làm gì (tránh gọi API lặp)
            if (
              oldBachelor &&
              oldBachelor.studentCode === studentCode &&
              JSON.stringify(oldBachelor) === JSON.stringify(bachelorData)
            ) {
              // preserve sessionInDay from old cache if present
              bachelorData.sessionInDay = oldBachelor.sessionInDay;
              return; // nothing changed -> skip updates
            }

            // Nếu đến đây, dữ liệu đã thay đổi -> cập nhật cache ngay lập tức
            queryClient.setQueryData(currentDataKey, bachelorData);

            // A. Cập nhật Session ID mới nhất vào cache riêng (chỉ khi sessionNum khác)
            if (sessionNum) {
              const prevLatest = queryClient.getQueryData(
                getLatestSessionKey(hallId)
              ) as string | undefined;
              if (String(sessionNum) !== String(prevLatest)) {
                queryClient.setQueryData(
                  getLatestSessionKey(hallId),
                  String(sessionNum)
                );
                // Kích hoạt fetch API NGẦM để lấy dữ liệu chính thức cho hall này
                queryClient.invalidateQueries({
                  queryKey: currentDataKey,
                  refetchType: 'active',
                });
              }
            } else {
              // Nếu không có sessionNum thay đổi, vẫn có thể muốn refetch
              queryClient.invalidateQueries({
                queryKey: currentDataKey,
                refetchType: 'active',
              });
            }
          } else if (!image) {
            // Không có hình ảnh (tín hiệu reset) => clear dữ liệu
            queryClient.setQueryData(currentDataKey, null);
          }
        }
      } catch (e) {
        console.error('Error parsing SignalR payload in useAllHallsData:', e, {
          message,
        });
      }
    };

    connection.on('SendMessage', handler);
    return () => {
      connection.off('SendMessage', handler);
    };
  }, [connection, queryClient, ALL_HALLS]); // 3. Đọc dữ liệu từ React Query Cache (Fetch bằng Hall ID và Session ID)

  const hallQueries = useQueries({
    queries: ALL_HALLS.map((hall) => {
      const hallId = hall.hallId;
      const currentDataKey = getCurrentDataKey(hallId);

      return {
        queryKey: currentDataKey,
        queryFn: async () => {
          // Lấy Session ID mới nhất đã được lưu từ SignalR
          const latestSessionId = queryClient.getQueryData(
            getLatestSessionKey(hallId)
          ) as string | undefined;

          if (!latestSessionId) {
            return null;
          }

          const result = await getCurrentLedBachelors(hallId, latestSessionId);
          return result?.bachelor2 ?? null;
        },
        enabled: !hallListLoading,
        refetchOnWindowFocus: false, // 💡 Tăng staleTime lên 5s (như cũ) và đảm bảo queryFn trả về format nhất quán
        staleTime: 5000,
      };
    }),
  });

  const isFetchingAny = hallQueries.some((q) => q.isFetching); // 4. Kết hợp kết quả

  const allHallsData = useMemo(() => {
    return ALL_HALLS.map((hall, index) => {
      // Dữ liệu từ cache hiện tại đã là đối tượng Bachelor (không cần check .bachelor2)
      const bachelor = hallQueries[index]?.data;

      return {
        hallInfo: hall,
        bachelor: (bachelor as Bachelor | null) ?? null,
        isFetching: hallQueries[index]?.isFetching,
      };
    });
  }, [ALL_HALLS, hallQueries]);

  return {
    allHallsData,
    isFetchingAny,
    isConnected,
    hallListLoading,
  };
}
