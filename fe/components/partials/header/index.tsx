'use client';
import { SheetMenu } from '@/components/partials/sidebar/menu/sheet-menu';
import { SidebarToggle } from '@/components/partials/sidebar/sidebar-toggle';
import HeaderContent from './header-content';
import HeaderSearch from './header-search';
import ProfileInfo from './profile-info';
import ThemeSwitcher from './theme-switcher';

import HeaderLogo from './header-logo';

const DashCodeHeader = () => {
  return (
    <>
      <HeaderContent>
        <div className=' flex gap-3 items-center'>
          <HeaderLogo />
          <SidebarToggle />
          <HeaderSearch />
        </div>
        <div className='nav-tools flex items-center  md:gap-4 gap-3'>
          <ThemeSwitcher />
          <ProfileInfo />
          <SheetMenu />
        </div>
      </HeaderContent>
    </>
  );
};

export default DashCodeHeader;
