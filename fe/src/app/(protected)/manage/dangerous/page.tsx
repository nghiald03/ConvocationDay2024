'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { resetDatabase } from '@/features/admin/api/reset-database';
import { deleteAllBachelors } from '@/features/bachelor/api/delete-all-bachelors';
import { uncheckAll } from '@/features/check-in/api/uncheck-all';
import { getBachelors } from '@/features/bachelor/api/get-bachelors';
import { exportToExcel } from '@/features/bachelor/ui/export-bachelors-to-excel';
import { useMutation } from '@tanstack/react-query';
import React from 'react';
import toast from 'react-hot-toast';
import swal from 'sweetalert';
export default function Page() {
  type Action = {
    description: string;
    action: string;
  };
  const dangerMutation = useMutation({
    mutationFn: (action: Action) => {
      if (action.action === 'resetAllData') {
        return resetDatabase();
      } else if (action.action === 'deleteAllData') {
        return deleteAllBachelors();
      }
      return uncheckAll();
    },
  });
  const handleAction = (action: Action) => {
    swal({
      title: action.description,
      text: `Bạn có muốn ${action.description} không?`,
      icon: 'warning',
      buttons: ['Không', 'Thực hiện'],
      dangerMode: true,
    }).then((value) => {
      if (value) {
        // checkinAction.mutate(data);
        toast.promise(
          dangerMutation.mutateAsync(action),
          {
            loading: 'Đang thực hiện...',
            success: `${action.description} thành công`,
            error: `${action.description} thất bại!`,
          },
          { position: 'top-right', duration: 6000 }
        );
      }
    });
  };

  const checkinAction = useMutation({
    mutationFn: () => {
      return getBachelors({
        pageIndex: 1,
        pageSize: 3000,
      });
    },
    onError: (error) => {
      console.log('onError', error);
    },
    onSuccess: (data, variables) => {
      console.log('onSuccess', data);
      console.log('data', data.items);
      exportToExcel(data.items, 'bachelor_list.xlsx');
    },
  });
  return (
    <>
      <Card>
        <CardContent className='p-3 flex gap-3'>
          <Button
            color='destructive'
            onClick={() => {
              handleAction({
                description: 'Reset toàn bộ dữ liệu',
                action: 'resetAllData',
              });
            }}
          >
            Reset toàn bộ dữ liệu
          </Button>
          <Button
            color='destructive'
            onClick={() => {
              handleAction({
                description: 'Xóa toàn bộ dữ liệu tân cử nhân',
                action: 'deleteAllData',
              });
            }}
          >
            Xóa toàn bộ dữ liệu tân cử nhân
          </Button>
          <Button
            color='destructive'
            onClick={() => {
              handleAction({
                description: 'Hủy toàn bộ dữ liệu checkin',
                action: 'cancelAllCheckin',
              });
            }}
          >
            Hủy toàn bộ dữ liệu checkin
          </Button>
          <Button
            onClick={() => {
              checkinAction.mutate();
            }}
            disabled={checkinAction.isPending}
          >
            {checkinAction.isPending
              ? 'Đang thực hiện...'
              : 'Lấy danh sách tân cử nhân'}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
