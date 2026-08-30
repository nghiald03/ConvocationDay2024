import React from 'react';
import { Icon } from './ui/icon';
import { cn } from '@/lib/utils';

export default function FetchingError({ isError }: { isError: boolean }) {
  return (
    <div
      className={cn('h-full w-full flex justify-center items-center', {
        hidden: !isError,
      })}
    >
      {isError ? (
        <div className='flex-1 flex-col justify-center items-center align-middle  py-12'>
          <div className='flex justify-center items-center'>
            <Icon icon={'codicon:error'} className='w-16 h-16 text-center' />
          </div>
          <div className='text-lg font-medium text-default-900 text-center mt-2'>
            Có lỗi xảy ra, vui lòng thử lại!
          </div>
        </div>
      ) : null}
    </div>
  );
}
