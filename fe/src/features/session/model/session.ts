export type Session = {
  sessionId: number;
  session1: number | null;
  sessionInDay: number | null;
  description: string | null;
};

export type HallSession = {
  checkinId: number;
  status: boolean | null;
  hallId: number;
  hallName: string;
  sessionId: number;
  sessionNumber: number | null;
  sessionInDay: number | null;
  sessionDescription: string | null;
};
