export type CheckInBachelorInput = {
  studentCode: string;
  status: boolean;
  cancellationConfirmation?: string;
};

export type CheckInResult = {
  studentCode: string;
  fullName: string;
  chair: string | null;
  chairParent: string | null;
  /** Ghế trước khi bị đẩy xuống hàng Z; null nếu chưa bị đẩy. */
  originalChair?: string | null;
  /** true khi check-in lúc phiên đã khóa (đến trễ), dù giữ ghế hay bị xếp xuống cuối. */
  late: boolean;
  /** true khi đến trễ và bị xếp xuống cuối phiên; false là vẫn giữ nguyên ghế. */
  movedToEnd?: boolean;
};

export type CheckIn = {
  checkinId: number;
  hallName: string;
  sessionNum: number;
  sessionInDay: number | null;
  status: boolean | null;
};

export type CheckInStatusInput = {
  checkinId: number;
  status: boolean;
};

/** Kết quả dự kiến của một lần check-in, do `GET /Checkin/Preview` tính bằng đúng luật của check-in thật. */
export type CheckInPreview = {
  outcome: 'on-time' | 'late-keep-seat' | 'late-move-to-end' | 'not-open' | 'already-checked-in';
  chair: string | null;
  /** Ghế của người LED đang chiếu; null khi LED chưa chiếu. */
  currentChair: string | null;
  /** Ghế mới ở cuối phiên; chỉ có khi `late-move-to-end`. */
  newChair: string | null;
};
