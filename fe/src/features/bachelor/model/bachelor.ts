export type Bachelor = {
  id?: number;
  studentCode: string;
  fullName: string;
  mail: string;
  faculty?: string | null;
  major: string;
  image: string;
  status?: boolean;
  statusBaChelor?: string;
  hallName: string;
  sessionNum: number;
  chair: string;
  chairParent: string;
  checkinRoom?: string | null;
  checkIn?: boolean;
  timeCheckIn?: string;
  /** 0 chưa ghi nhận, 1 đúng giờ, 2 trễ (kể cả force check-in), 3 vắng. */
  attendanceStatus?: number | null;
  hall?: string | null;
  session?: string | null;
  sessionInDay?: number | null;
};
