'use client';

import { User } from '@/dtos/userDTO';
import { getMenuList } from '@/lib/menus';
import { isAccessTokenValid } from '@/utils/isLogin';
import { jwtDecode } from 'jwt-decode';

import { redirect, usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import toast from 'react-hot-toast';
export default function AuthentificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User>();

  const pathname = usePathname() ?? '/';
  const menuList = getMenuList(pathname);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        return;
      } else {
        const decodedToken = jwtDecode(accessToken);
        console.log(decodedToken);
        if (decodedToken) {
          console.log(decodedToken);
          setUser(decodedToken as User);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!user || !user.role) return;

    // Tìm menu chứa `pathname`
    const matchingMenu = menuList.find((group) =>
      group.menus.some((menu) => pathname.includes(menu.href))
    );

    if (matchingMenu) {
      const { roleAccess } = matchingMenu;

      // Kiểm tra nếu `user.role` không có trong `roleAccess`
      if (!roleAccess || !roleAccess.includes(user.role)) {
        toast.error('Bạn không có quyền truy cập vào mục này!', {
          position: 'top-right',
          duration: 5000,
        });
        redirect('/tutorial');
      }
    }
  }, [pathname, user]);
  return <>{children}</>;
}
