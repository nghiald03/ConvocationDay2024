'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { photoQueueSessionsQueryOptions } from '../queries/photo-queue-query-options';

type Props = {
  storageKey: string;
  title: string;
  onChange: (value: { photoSessionId: string; sessionLabel: string }) => void;
};

export function PhotoQueueSessionOnlySelector({ storageKey, title, onChange }: Props) {
  const [photoSessionId, setPhotoSessionId] = useState('');
  const { data, isLoading } = useQuery(photoQueueSessionsQueryOptions);
  const sessions = useMemo(() => data ?? [], [data]);

  useEffect(() => {
    const stored = window.localStorage.getItem(`${storageKey}:session`);
    if (stored) setPhotoSessionId(stored);
  }, [storageKey]);

  useEffect(() => {
    if (!photoSessionId) return;
    const session = sessions.find((item) => String(item.id) === photoSessionId);
    const sessionLabel = session?.name ?? `Phiên chụp ảnh ${photoSessionId}`;
    window.localStorage.setItem(`${storageKey}:session`, photoSessionId);
    onChange({ photoSessionId, sessionLabel });
  }, [onChange, photoSessionId, sessions, storageKey]);

  return (
    <Card className='border bg-card text-card-foreground shadow-sm'>
      <CardHeader className='pb-2'>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <CalendarDays className='h-5 w-5 text-foreground' />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-2'>
          <Label htmlFor={`${storageKey}-session`}>Phiên chụp ảnh</Label>
          <Select value={photoSessionId} onValueChange={setPhotoSessionId} disabled={isLoading}>
            <SelectTrigger id={`${storageKey}-session`} className='h-11'>
              <SelectValue placeholder='Chọn phiên' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Phiên</SelectLabel>
                {sessions.map((session) => (
                  <SelectItem key={session.id} value={String(session.id)}>
                    {`${session.name}${session.description ? ` - ${session.description}` : ''}`}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
