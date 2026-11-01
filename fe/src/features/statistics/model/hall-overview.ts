export type HallOverviewSession = {
  sessionId: number;
  sessionNumber: number;
  totalStudents: number;
  checkedInCount: number;
};

export type HallOverview = {
  hallId: number;
  hallName: string;
  totalSessions: number;
  sessions: HallOverviewSession[];
  currentSessionId: number | null;
  currentSessionNumber: number | null;
};
