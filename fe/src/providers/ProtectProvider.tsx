'use client';

import { useSession } from '@/features/auth/queries/session-provider';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

export default function ProtectProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();
  useEffect(() => {
    if (!session) router.replace('/');
  }, [router, session]);
  return session ? children : null;
}
