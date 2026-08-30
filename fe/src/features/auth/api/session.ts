import { httpClient } from '@/lib/http/client';
import type { SessionUser } from '../model/session-user';

export async function getSession() {
  const response = await httpClient.get<SessionUser>('/auth/me');
  return response.data;
}

export async function login(credentials: { userName: string; password: string }) {
  const response = await httpClient.post<SessionUser>('/auth/login', credentials);
  return response.data;
}

export async function logout() {
  await httpClient.post('/auth/logout');
}

export async function requestPasswordReset(email: string) {
  const response = await httpClient.post<{ message: string; token?: string }>('/auth/password/reset/request', { email });
  return response.data;
}

export async function confirmPasswordReset(input: { email: string; token: string; newPassword: string }) {
  await httpClient.post('/auth/password/reset/confirm', input);
}
