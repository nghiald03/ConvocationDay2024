import axios from 'axios';
import { httpClient } from '@/lib/http/client';
import { normalizeSessionUser, type SessionUserPayload } from '../model/normalize-session-user';

/** Phiên hiện tại; `null` khi đã hết phiên (401/403) để giao diện biết mà đưa về đăng nhập. Lỗi khác (mạng, server) vẫn ném ra. */
export async function getSession() {
  try {
    const response = await httpClient.get<SessionUserPayload>('/auth/me');
    return normalizeSessionUser(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) return null;
    throw error;
  }
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
