export type CheckInBachelorInput = {
  studentCode: string;
  status: boolean;
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
