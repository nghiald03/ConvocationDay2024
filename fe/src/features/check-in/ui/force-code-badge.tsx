'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getForceCheckInCode } from '../api/get-force-check-in-code';
import { formatCountdown } from '../model/force-code';

/** Mã force check-in hiện tại cho Check-in Lead và Manager đọc cho CK. */
export function ForceCodeBadge() {
  const { data, dataUpdatedAt, refetch, isError } = useQuery({
    queryKey: ['check-in', 'force-code'],
    queryFn: getForceCheckInCode,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remainingMs = data ? dataUpdatedAt + data.expiresInMs - now : 0;
  useEffect(() => {
    if (data && remainingMs <= 0) void refetch();
  }, [data, remainingMs, refetch]);

  return (
    <div className='flex items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2'>
      <span className='text-sm text-default-700'>Mã force check-in</span>
      <span className='font-mono text-xl font-bold tracking-[0.3em]'>
        {isError ? 'Lỗi' : data && remainingMs > 0 ? data.code : '····'}
      </span>
      <span className='text-xs text-default-500'>
        {data && remainingMs > 0 ? `đổi sau ${formatCountdown(remainingMs)}` : 'đang lấy mã mới…'}
      </span>
    </div>
  );
}
