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
import { useLogout, useSession } from '@/features/auth/queries/session-provider';

const ProfileInfo = () => {
  const user = useSession();
  const logout = useLogout();
  return (
    <div className='md:block hidden'>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type='button'
            aria-label='Menu người dùng'
            className='flex items-center gap-2 rounded-md px-2 py-1.5 text-default-800 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          >
            <div className='text-sm font-semibold'>
              Hi. {user?.fullName}
              <Badge className='h-full ml-2' color='primary' variant='soft'>
                {user?.role}{' '}
              </Badge>
            </div>

            <div className='text-sm font-medium  capitalize lg:block hidden  '></div>
            <span className='text-base lg:inline-block hidden text-muted-foreground'>
              <Icon icon='heroicons-outline:chevron-down'></Icon>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-56 p-0' align='end'>
          <DropdownMenuSeparator className='mb-0 dark:bg-background' />
          <DropdownMenuItem
            className='flex items-center gap-2 text-sm font-medium text-default-600 capitalize my-1 px-3 cursor-pointer'
            onClick={async (e) => {
              e.preventDefault();
              await logout();
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
