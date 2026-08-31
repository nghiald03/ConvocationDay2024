import { httpClient } from '@/lib/http/client';
import { normalizeSessionUser, type SessionUserPayload } from '../model/normalize-session-user';

export async function getSession() {
  const response = await httpClient.get<SessionUserPayload>('/auth/me');
  return normalizeSessionUser(response.data);
}

export async function login(credentials: {
  userName: string;
  password: string;
  rememberMe: boolean;
}) {
  const response = await httpClient.post<SessionUserPayload>('/auth/login', credentials);
  return normalizeSessionUser(response.data);
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
