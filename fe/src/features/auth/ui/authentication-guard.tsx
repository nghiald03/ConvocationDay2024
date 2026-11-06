'use client';

import { useSession } from '@/features/auth/queries/session-provider';
import { useRouter } from 'next/navigation';
import { loginUrlFor } from '../model/login-redirect';
import { useEffect, type ReactNode } from 'react';

export default function AuthenticationGuard({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();
  useEffect(() => {
    // Mất phiên (hết hạn, bị đổi quyền): về đăng nhập, đăng nhập xong quay lại đúng trang đang xem.
    if (!session) router.replace(loginUrlFor(`${window.location.pathname}${window.location.search}`));
  }, [router, session]);
  return session ? children : null;
}
