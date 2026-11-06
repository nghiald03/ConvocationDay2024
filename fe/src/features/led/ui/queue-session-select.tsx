'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { sessionQueryOptions } from '@/features/session/queries/session-query-options';

function read(key: string) {
  try {
    return window.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Trình duyệt chặn lưu trữ: vẫn dùng bình thường, chỉ không nhớ lựa chọn.
  }
}

/** Phiên đang chọn (nhớ theo `storageKey`); null khi chưa chọn. */
export function useStoredSession(storageKey: string) {
  const [value, setValue] = useState('');
  useEffect(() => setValue(read(storageKey)), [storageKey]);
  const select = (next: string) => {
    setValue(next);
    write(storageKey, next);
  };
  return { value, select, sessionId: value === '' ? null : Number(value) };
}

export function QueueSessionSelect({
  id,
  value,
  onChange,
  triggerClassName = '',
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Lớp thêm cho ô chọn, ví dụ viền cam để khớp trang sơ đồ đầu giờ. */
  triggerClassName?: string;
}) {
  const { data: sessions = [] } = useQuery(sessionQueryOptions);
  return (
    <div className='space-y-2'>
      <Label htmlFor={id} className='text-sm font-medium'>
        Phiên
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className={`h-11 w-full ${triggerClassName}`} aria-label='Chọn phiên'>
          <SelectValue placeholder='Chọn phiên…' />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Phiên</SelectLabel>
            {sessions.map((item) => (
              <SelectItem key={item.sessionId} value={String(item.sessionId)}>
                Phiên {item.session1 ?? item.sessionId}
                {item.description ? ` · ${item.description}` : ''}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
