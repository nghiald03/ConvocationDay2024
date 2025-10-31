'use client';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { User } from '@/dtos/userDTO';

import Link from "next/link";
import { jwtDecode } from 'jwt-decode';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const ProfileInfo = () => {
  const [user, setUser] = useState<User>();
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        return;
      } else {
        const decodedToken = jwtDecode(accessToken);
        console.log(decodedToken);
        if (decodedToken) {
          setUser(decodedToken as User);
        }
      }
    }
  }, []);
  return (
    <div className='md:block hidden'>
      <DropdownMenu>
        <DropdownMenuTrigger asChild className=' cursor-pointer'>
          <div className=' flex items-center gap-2  text-default-800 '>
            <div className='text-sm font-bold'>
              Hi. {user?.fullname}
              <Badge className='h-full ml-2' color='primary'>
                {user?.role}{' '}
              </Badge>
            </div>

            <div className='text-sm font-medium  capitalize lg:block hidden  '></div>
            <span className='text-base  me-2 lg:inline-block hidden'>
              <Icon icon='heroicons-outline:chevron-down'></Icon>
            </span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-56 p-0' align='end'>
          <DropdownMenuSeparator className='mb-0 dark:bg-background' />
          <DropdownMenuItem
            className='flex items-center gap-2 text-sm font-medium text-default-600 capitalize my-1 px-3 cursor-pointer'
            onClick={async (e) => {
              e.preventDefault();
              console.log('[DEBUG] Logout clicked!');

              // Clear localStorage
              localStorage.clear();
              console.log('[DEBUG] LocalStorage cleared');

              // Force page reload to login page
              console.log('[DEBUG] Reloading to /en');
              window.location.replace('/');
              console.log('[DEBUG] Window.location.replace called');
            }}
          >
            <Icon icon='heroicons:power' className='w-4 h-4' />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
export default ProfileInfo;
