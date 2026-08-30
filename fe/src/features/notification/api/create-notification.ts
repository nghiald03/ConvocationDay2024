import { httpClient } from '@/lib/http/client';
import type { CreateNotificationRequest } from '../model/notification';

type CreateNotificationResponse = {
  message: string;
  notificationId: number;
};

export async function createNotification(input: CreateNotificationRequest) {
  const response = await httpClient.post<CreateNotificationResponse>(
    '/Notification',
    input
  );
  return response.data;
}
