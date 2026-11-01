'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createSession } from '@/features/session/api/create-session';
import { deleteSession, updateSession } from '@/features/session/api/manage-sessions';
import type { Session } from '@/features/session/model/session';
import { sessionQueryOptions } from '@/features/session/queries/session-query-options';
import { getHttpErrorMessage } from '@/lib/http/get-http-error-message';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import toast from 'react-hot-toast';
import swal from 'sweetalert';

type Form = { session: Session | null; sessionNum: string; sessionInDay: string; description: string };

const emptyForm: Form = { session: null, sessionNum: '', sessionInDay: '', description: '' };

function toInput(form: Form) {
  return {
    sessionNum: Number(form.sessionNum),
    sessionInDay: form.sessionInDay ? Number(form.sessionInDay) : undefined,
    description: form.description.trim() || undefined,
  };
}

export default function SessionManagementPage() {
  const queryClient = useQueryClient();
  const { data: sessions = [], isLoading } = useQuery(sessionQueryOptions);
  const [form, setForm] = React.useState<Form | null>(null);

  const sorted = React.useMemo(
    () => [...sessions].sort((a, b) => (a.session1 ?? 0) - (b.session1 ?? 0)),
    [sessions]
  );
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['session'] });

  const save = useMutation({
    mutationFn: async (value: Form) => {
      const input = toInput(value);
      if (value.session) await updateSession(value.session.sessionId, input);
      else await createSession({ ...input, sessionInDay: input.sessionInDay ?? 1 });
    },
    onSuccess: (_result, value) => {
      toast.success(value.session ? 'Đã cập nhật phiên.' : 'Đã tạo phiên.');
      setForm(null);
      void refresh();
    },
    onError: (error) => toast.error(getHttpErrorMessage(error, 'Lưu phiên thất bại.')),
  });

  const remove = useMutation({
    mutationFn: (session: Session) => deleteSession(session.sessionId),
    onSuccess: () => {
      toast.success('Đã xóa phiên.');
      void refresh();
    },
    onError: (error) => toast.error(getHttpErrorMessage(error, 'Xóa phiên thất bại.')),
  });

  const confirmDelete = async (session: Session) => {
    const confirmed = await swal({
      title: `Xóa phiên ${session.session1 ?? session.sessionId}?`,
      text: 'Chỉ xóa được phiên chưa có tân cử nhân hoặc dữ liệu check-in.',
      icon: 'warning',
      buttons: ['Hủy', 'Xóa'],
      dangerMode: true,
    });
    if (confirmed) remove.mutate(session);
  };

  const valid = form !== null && Number(form.sessionNum) >= 1 && Number.isInteger(Number(form.sessionNum));

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between gap-3 space-y-0'>
        <CardTitle>Quản lý phiên (session)</CardTitle>
        <Button onClick={() => setForm(emptyForm)}>Thêm phiên</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-24'>ID</TableHead>
              <TableHead className='w-28'>Số phiên</TableHead>
              <TableHead className='w-32'>Buổi trong ngày</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead className='w-48 text-right'>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((session) => (
              <TableRow key={session.sessionId}>
                <TableCell>{session.sessionId}</TableCell>
                <TableCell className='font-medium'>{session.session1 ?? '—'}</TableCell>
                <TableCell>{session.sessionInDay ?? '—'}</TableCell>
                <TableCell>{session.description || '—'}</TableCell>
                <TableCell className='space-x-2 text-right'>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() =>
                      setForm({
                        session,
                        sessionNum: String(session.session1 ?? ''),
                        sessionInDay: String(session.sessionInDay ?? ''),
                        description: session.description ?? '',
                      })
                    }
                  >
                    Sửa
                  </Button>
                  <Button
                    size='sm'
                    color='destructive'
                    disabled={remove.isPending}
                    onClick={() => void confirmDelete(session)}
                  >
                    Xóa
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!sorted.length && (
              <TableRow>
                <TableCell colSpan={5} className='text-center text-muted-foreground'>
                  {isLoading ? 'Đang tải…' : 'Chưa có phiên nào.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.session ? 'Sửa phiên' : 'Thêm phiên'}</DialogTitle>
          </DialogHeader>
          <form
            className='space-y-4'
            onSubmit={(event) => {
              event.preventDefault();
              if (form && valid) save.mutate(form);
            }}
          >
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='session-num'>Số phiên</Label>
                <Input
                  id='session-num'
                  type='number'
                  min={1}
                  autoFocus
                  value={form?.sessionNum ?? ''}
                  onChange={(event) => setForm((current) => current && { ...current, sessionNum: event.target.value })}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='session-in-day'>Buổi trong ngày</Label>
                <Input
                  id='session-in-day'
                  type='number'
                  min={1}
                  placeholder='1'
                  value={form?.sessionInDay ?? ''}
                  onChange={(event) => setForm((current) => current && { ...current, sessionInDay: event.target.value })}
                />
              </div>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='session-description'>Mô tả</Label>
              <Input
                id='session-description'
                maxLength={500}
                placeholder='Ví dụ: Phiên buổi sáng'
                value={form?.description ?? ''}
                onChange={(event) => setForm((current) => current && { ...current, description: event.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setForm(null)}>
                Hủy
              </Button>
              <Button type='submit' disabled={save.isPending || !valid}>
                {save.isPending ? 'Đang lưu…' : 'Lưu'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
