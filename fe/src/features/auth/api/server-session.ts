import 'server-only';
import { cookies } from 'next/headers';
import { serverEnv } from '@/lib/env/server';
import type { SessionUser } from '../model/session-user';

export async function getServerSession(): Promise<SessionUser | null> {
  const cookieHeader = cookies().getAll().map(({ name, value }) => `${name}=${value}`).join('; ');
  const response = await fetch(`${serverEnv.API_URL}/auth/me`, {
    headers: { cookie: cookieHeader },
    cache: 'no-store',
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error(`Session lookup failed with status ${response.status}`);
  return response.json();
}
