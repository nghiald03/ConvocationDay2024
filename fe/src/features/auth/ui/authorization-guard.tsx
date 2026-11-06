'use client';

import { canAccessMenu, getMenuList } from '@/lib/menus';
import { useSession } from '@/features/auth/queries/session-provider';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import toast from '@/lib/toast';

export default function AuthorizationGuard({ children }: { children: ReactNode }) {
  const user = useSession();
  const pathname = usePathname() ?? '/';
  const router = useRouter();

  useEffect(() => {
    if (!user?.role) return;
    const group = getMenuList(pathname).find((item) =>
      item.menus.some((menu) => pathname.includes(menu.href))
    );
    const menu = group?.menus.find((item) => pathname.includes(item.href));
    if (group && menu && !canAccessMenu(group, menu, user.role)) {
      toast.error('Bạn không có quyền truy cập vào mục này!');
      router.replace('/tutorial');
    }
  }, [pathname, router, user]);

  return children;
}
