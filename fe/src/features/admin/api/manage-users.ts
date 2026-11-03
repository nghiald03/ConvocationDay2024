import { httpClient } from '@/lib/http/client';

export type ManagedUser = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  checkinRooms: string[];
  disabled: boolean;
  lockedUntil: string | null;
  createdAt: string;
};

export type Role = { code: string; name: string };

export async function getUsers() {
  return (await httpClient.get<ManagedUser[]>('/Users')).data;
}

export async function getRoles() {
  return (await httpClient.get<Role[]>('/Users/roles')).data;
}

export async function createUser(input: { email: string; name: string; password: string; roles: string[]; checkinRooms: string[] }) {
  return (await httpClient.post<ManagedUser>('/Users', input)).data;
}

export async function updateUser(id: string, input: { name?: string; roles?: string[]; checkinRooms?: string[]; disabled?: boolean }) {
  return (await httpClient.put<ManagedUser>(`/Users/${encodeURIComponent(id)}`, input)).data;
}

export async function setUserPassword(id: string, password: string) {
  await httpClient.put(`/Users/${encodeURIComponent(id)}/password`, { password });
}

export async function deleteUser(id: string) {
  await httpClient.delete(`/Users/${encodeURIComponent(id)}`);
}
