'use client';

import { getMenuList } from '@/lib/menus';

import IconNav from './icon-nav';
import SidebarNav from './sideabr-nav';
import { usePathname } from 'next/navigation';

export function MenuTwoColumn() {
  // translate

  const pathname = usePathname() || '/';
  const menuList = getMenuList(pathname);

  return (
    <>
      <IconNav menuList={menuList} />
      <SidebarNav menuList={menuList} />
    </>
  );
}
