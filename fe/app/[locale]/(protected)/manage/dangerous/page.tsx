'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { manageAPI } from '@/config/axios';
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
        return manageAPI.resetDatabase();
      } else if (action.action === 'deleteAllData') {
        return manageAPI.deleteAllBachelor();
      }
      return manageAPI.uncheckAll();
    },
    onSuccess: (variables, context) => {
      toast.success(` ${context.description} thành công`, {
        duration: 5000,
        position: 'top-right',
      });

      console.log('variables', context);
    },
    onError: (error: any, c) => {
      toast.error(`${c.description} thất bại! ` + error.respone.data, {
        duration: 5000,
        position: 'top-right',
      });
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
        </CardContent>
      </Card>
    </>
  );
}
