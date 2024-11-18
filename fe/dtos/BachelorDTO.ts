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
  hallName: number;
  sessionNum: number;
  chair: string;
  chairParent: string;
  checkIn?: boolean;
  timeCheckIn?: string;
  hall?: string | null;
  session?: string | null;
};
