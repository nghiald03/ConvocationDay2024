'use client';
import React from 'react';
import DateRangePicker from '@/components/date-range-picker';

import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

const PageTitle = ({
  title,
  className,
}: {
  title?: string;
  className?: string;
}) => {
  const pathname = usePathname();
  const name = pathname?.split('/').slice(1).join(' ');

  return (
    <div
      className={cn(
        'flex flex-wrap gap-4 items-center justify-between',
        className
      )}
    >
      <div className='text-2xl font-medium text-default-800 capitalize'>
        {title ? title : name ? name : null}
      </div>
      <DateRangePicker />
    </div>
  );
};

export default PageTitle;
