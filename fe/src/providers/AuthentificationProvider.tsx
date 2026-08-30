'use client';

import { getMenuList } from '@/lib/menus';
import { useSession } from '@/features/auth/queries/session-provider';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import toast from 'react-hot-toast';

export default function AuthentificationProvider({ children }: { children: ReactNode }) {
  const user = useSession();
  const pathname = usePathname() ?? '/';
  const router = useRouter();

  useEffect(() => {
    if (!user?.role) return;
    const matchingMenu = getMenuList(pathname).find((group) =>
      group.menus.some((menu) => pathname.includes(menu.href))
    );
    if (matchingMenu?.roleAccess && !matchingMenu.roleAccess.includes(user.role)) {
      toast.error('Bạn không có quyền truy cập vào mục này!');
      router.replace('/tutorial');
    }
  }, [pathname, router, user]);

  return children;
}
