'use client';

import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Pencil, Trash2 } from 'lucide-react';
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
import { createHall, deleteHall, updateHall } from '@/features/hall/api/manage-halls';
import type { Hall } from '@/features/hall/model/hall';
import { hallQueryOptions } from '@/features/hall/queries/hall-query-options';
import { getHttpErrorMessage } from '@/lib/http/get-http-error-message';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import toast from '@/lib/toast';
import swal from 'sweetalert';

type Editing = { hall: Hall | null; name: string } | null;

export default function HallManagementPage() {
  const queryClient = useQueryClient();
  const { data: halls = [], isLoading } = useQuery(hallQueryOptions);
  const [editing, setEditing] = React.useState<Editing>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['hall'] });

  const save = useMutation({
    mutationFn: ({ hall, name }: NonNullable<Editing>) =>
      hall ? updateHall(hall.hallId, name.trim()) : createHall(name.trim()).then(() => undefined),
    onSuccess: (_result, { hall }) => {
      toast.success(hall ? 'Đã cập nhật side.' : 'Đã tạo side.');
      setEditing(null);
      void refresh();
    },
    onError: (error) => toast.error(getHttpErrorMessage(error, 'Lưu side thất bại.')),
  });

  const remove = useMutation({
    mutationFn: (hall: Hall) => deleteHall(hall.hallId),
    onSuccess: () => {
      toast.success('Đã xóa side.');
      void refresh();
    },
    onError: (error) => toast.error(getHttpErrorMessage(error, 'Xóa side thất bại.')),
  });

  const confirmDelete = async (hall: Hall) => {
    const confirmed = await swal({
      title: `Xóa "${hall.hallName}"?`,
      text: 'Chỉ xóa được side chưa có tân cử nhân hoặc dữ liệu check-in.',
      icon: 'warning',
      buttons: ['Hủy', 'Xóa'],
      dangerMode: true,
    });
    if (confirmed) remove.mutate(hall);
  };

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between gap-3 space-y-0'>
        <CardTitle>Quản lý side</CardTitle>
        <Button onClick={() => setEditing({ hall: null, name: '' })}>Thêm side</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-24'>ID</TableHead>
              <TableHead>Tên side</TableHead>
              <TableHead className='w-28 text-right'>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {halls.map((hall) => (
              <TableRow key={hall.hallId}>
                <TableCell>{hall.hallId}</TableCell>
                <TableCell className='font-medium'>{hall.hallName}</TableCell>
                <TableCell className='space-x-1.5 text-right'>
                  <IconButton
                    icon={Pencil}
                    label='Sửa hội trường'
                    onClick={() => setEditing({ hall, name: hall.hallName })}
                  />
                  <IconButton
                    icon={Trash2}
                    label='Xóa hội trường'
                    color='destructive'
                    disabled={remove.isPending}
                    onClick={() => void confirmDelete(hall)}
                  />
                </TableCell>
              </TableRow>
            ))}
            {!halls.length && (
              <TableRow>
                <TableCell colSpan={3} className='text-center text-muted-foreground'>
                  {isLoading ? 'Đang tải…' : 'Chưa có side nào.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.hall ? 'Sửa side' : 'Thêm side'}</DialogTitle>
          </DialogHeader>
          <form
            className='space-y-4'
            onSubmit={(event) => {
              event.preventDefault();
              if (editing && editing.name.trim()) save.mutate(editing);
            }}
          >
            <div className='space-y-2'>
              <Label htmlFor='hall-name'>Tên side</Label>
              <Input
                id='hall-name'
                autoFocus
                maxLength={100}
                value={editing?.name ?? ''}
                onChange={(event) =>
                  setEditing((current) => current && { ...current, name: event.target.value })
                }
              />
            </div>
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setEditing(null)}>
                Hủy
              </Button>
              <Button type='submit' disabled={save.isPending || !editing?.name.trim()}>
                {save.isPending ? 'Đang lưu…' : 'Lưu'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
