/** Một dòng của hàng đợi LED do `GET /Mc/GetQueue` trả về, theo đúng thứ tự MC sẽ chiếu. */
export type LedQueueItem = {
  position: number;
  id: number;
  studentCode: string;
  fullName: string;
  chair: string | null;
  /** Ghế lưới A–J trước khi bị đẩy xuống hàng Z; null nếu chưa bị đẩy. */
  originalChair: string | null;
  bachelorStatus: string | null;
  /** 1 đúng giờ, 2 trễ, 3 vắng. */
  attendanceStatus: number;
  timeCheckIn: string | null;
  /** true khi đứng ở hàng Z (đến trễ và bị xếp xuống cuối phiên). */
  isTail: boolean;
  progress: 'done' | 'current' | 'upcoming';
};

export type LedQueue = {
  total: number;
  currentIndex: number | null;
  /** Ghế của người cuối cùng không phải hàng Z: mốc để xếp người đến trễ phía sau. */
  lastRegularChair: string | null;
  items: LedQueueItem[];
};

export const ATTENDANCE_LATE = 2;

export type LateQueueView = {
  /** Bị đẩy xuống cuối phiên, theo thứ tự sẽ được gọi. */
  movedToEnd: LedQueueItem[];
  /** Đến trễ nhưng LED còn cách xa nên giữ nguyên ghế. */
  keptSeat: LedQueueItem[];
};

/** Tách những người đến trễ khỏi hàng đợi để điều phối biết ai phải xếp ở cuối. */
export function selectLateItems(queue: LedQueue | undefined): LateQueueView {
  const late = (queue?.items ?? []).filter((item) => item.attendanceStatus === ATTENDANCE_LATE);
  return {
    movedToEnd: late.filter((item) => item.isTail),
    keptSeat: late.filter((item) => !item.isTail),
  };
}

/** Bỏ dấu và chữ hoa để tìm "nguyen" ra "Nguyễn". */
export function foldSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/** Lọc hàng đợi theo tên, MSSV hoặc ghế (kể cả ghế gốc); giữ nguyên thứ tự gọi. */
export function filterQueueItems(items: LedQueueItem[], keyword: string): LedQueueItem[] {
  const needle = foldSearchText(keyword);
  if (!needle) return items;
  return items.filter((item) =>
    [item.fullName, item.studentCode, item.chair ?? '', item.originalChair ?? ''].some((text) =>
      foldSearchText(text).includes(needle),
    ),
  );
}

/** Số người đã chiếu, đang chiếu và còn chờ của một hàng đợi. */
export function countProgress(queue: LedQueue | undefined) {
  const items = queue?.items ?? [];
  return {
    done: items.filter((item) => item.progress === 'done').length,
    current: items.filter((item) => item.progress === 'current').length,
    upcoming: items.filter((item) => item.progress === 'upcoming').length,
  };
}
