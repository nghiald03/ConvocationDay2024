'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { hallQueryOptions } from '@/features/hall/queries/hall-query-options';
import { sessionsByHallQueryOptions } from '@/features/session/queries/session-query-options';
import type { HallSession } from '@/features/session/model/session';


type PickerValue = {
  hallId: string;
  hallName?: string;
  sessionId: string;
  sessionLabel?: string;
  sessionInDay?: string;
};

export type HallSessionPickerProps = {
  onChange?: (value: PickerValue) => void;
  storageKey?: string;
  title?: string;
  /** Giữ lại để tương thích, nhưng layout mới luôn là 2 cột (stack trên mobile) */
  compact?: boolean;
};

export default function HallSessionPicker({
  onChange,
  storageKey = 'hallsession',
  title = 'Chọn hội trường và session',
}: HallSessionPickerProps) {
  const [hall, setHall] = useState<string>('');
  const [session, setSession] = useState<string>('');

  const {
    data: hallList,
    error: hallErr,
    isLoading: hallsLoading,
  } = useQuery(hallQueryOptions);

  const halls = useMemo(() => hallList ?? [], [hallList]);

  // Fetch sessions for selected hall only
  const {
    data: sessionsByHall,
    error: sessionsErr,
    isLoading: sessionsLoading,
  } = useQuery(sessionsByHallQueryOptions(hall ? Number(hall) : null));

  const sessions: HallSession[] = useMemo(
    () => sessionsByHall ?? [],
    [sessionsByHall]
  );

  // Load từ localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${storageKey}:picker`);
      if (raw) {
        const parsed = JSON.parse(raw) as PickerValue;
        if (parsed.hallId) setHall(String(parsed.hallId));
        if (parsed.sessionId) setSession(String(parsed.sessionId));
      }
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  // Thông báo lỗi fetch
  useEffect(() => {
    if (hallErr) toast.error('Lỗi lấy danh sách hội trường');
    if (sessionsErr) toast.error('Lỗi lấy danh sách session');
  }, [hallErr, sessionsErr]);

  // Bắn onChange + lưu localStorage khi đủ 2 select
  useEffect(() => {
    if (!hall || !session) return;

    const hallObj = halls.find((h) => String(h.hallId) === String(hall));
    const sesObj = sessions.find(
      (s) => String(s.sessionId) === String(session)
    );

    const value: PickerValue = {
      hallId: String(hall),
      hallName: hallObj?.hallName,
      sessionId: String(session),
      sessionLabel: sesObj
        ? `Phiên ${sesObj.sessionInDay ?? ''} (Session: ${
            sesObj.sessionNumber ?? ''
          })`
        : undefined,
    };

    try {
      localStorage.setItem(`${storageKey}:picker`, JSON.stringify(value));
    } catch {
      /* ignore */
    }

    onChange?.(value);
  }, [hall, session, halls, sessions, onChange, storageKey]);

  const disabled = hallsLoading || sessionsLoading;

  // Clear session when hall changes
  useEffect(() => {
    setSession('');
  }, [hall]);

  return (
    <Card className='relative shadow-lg border-0 overflow-hidden'>
      {/* Dải màu nhấn thương hiệu */}
      <div className='absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500' />
      <CardHeader className='pb-2'>
        <CardTitle className='text-lg flex items-center gap-2'>
          <Sparkles className='w-5 h-5 text-orange-500' />
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className='p-4'>
        {/* Lưới 2 cột: mỗi select chiếm 1/2; stack trên mobile */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {/* Cột 1: Hội trường */}
          <div className='space-y-2'>
            <Label htmlFor='hall-select' className='text-sm font-medium'>
              Hội trường
            </Label>

            <Select
              value={hall}
              onValueChange={setHall}
              disabled={disabled || halls.length === 0}
            >
              <SelectTrigger
                id='hall-select'
                className='w-full h-11 border-2 hover:border-orange-400 focus:ring-orange-500'
                aria-label='Chọn hội trường'
              >
                <SelectValue placeholder='🏛️ Chọn hội trường' />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Hội trường</SelectLabel>
                  {halls.map((h) => (
                    <SelectItem key={h.hallId} value={String(h.hallId)}>
                      {h.hallName}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Cột 2: Session */}
          <div className='space-y-2'>
            <Label htmlFor='session-select' className='text-sm font-medium'>
              Session
            </Label>

            <Select
              value={session}
              onValueChange={setSession}
              disabled={!hall || sessionsLoading || sessions.length === 0}
            >
              <SelectTrigger
                id='session-select'
                className='w-full h-11 border-2 hover:border-orange-400 focus:ring-orange-500'
                aria-label='Chọn session'
              >
                <SelectValue placeholder='📅 Chọn session' />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Session</SelectLabel>
                  {sessions.map((s) => (
                    <SelectItem key={s.sessionId} value={String(s.sessionId)}>
                      {`Session ${s.sessionInDay ?? ''} (Session TONG: ${
                        s.sessionNumber ?? s.sessionId
                      })`}{' '}
                      {s.sessionDescription ? ' - ' + s.sessionDescription : ''}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Gợi ý nhỏ dưới cùng */}
        <p className='mt-3 text-xs text-muted-foreground'>
          Lựa chọn của bạn sẽ được lưu tự động và áp dụng cho các trang liên
          quan.
        </p>
      </CardContent>
    </Card>
  );
}
