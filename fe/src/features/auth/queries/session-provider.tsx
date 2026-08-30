'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, type ReactNode } from 'react';
import { getSession, logout } from '../api/session';
import type { SessionUser } from '../model/session-user';

const SessionContext = createContext<SessionUser | null>(null);
export const sessionKey = ['auth', 'session'] as const;

export function SessionProvider({ children, initialSession }: { children: ReactNode; initialSession: SessionUser }) {
  const query = useQuery({ queryKey: sessionKey, queryFn: getSession, initialData: initialSession, retry: false });
  return <SessionContext.Provider value={query.data ?? null}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}

export function useLogout() {
  const queryClient = useQueryClient();
  return async () => {
    await logout();
    queryClient.removeQueries({ queryKey: sessionKey });
    window.location.assign('/');
  };
}
