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
  /** true khi phiên đã khóa và tân cử nhân vừa bị xếp xuống cuối phiên. */
  late: boolean;
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
