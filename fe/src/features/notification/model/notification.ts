export type CreateNotificationRequest = {
  title: string;
  content: string;
  priority: number;
  hallId?: number;
  sessionId?: number;
  scheduledAt?: string;
  isAutomatic?: boolean;
  repeatCount?: number;
};

export type Notification = {
  notificationId: number;
  title: string;
  content: string;
  priority: number;
  priorityText: string;
  hallId?: number;
  hallName?: string;
  sessionId?: number;
  sessionNumber?: number;
  createdBy: string;
  createdByName: string;
  broadcastBy?: string;
  broadcastByName?: string;
  createdAt: string;
  scheduledAt?: string;
  broadcastAt?: string;
  status: string;
  isAutomatic: boolean;
  repeatCount: number;
  scope: string;
};
