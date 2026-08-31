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
    confirmationText?: string;
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
    const confirmationInput = document.createElement('input');
    confirmationInput.className = 'swal-content__input';
    confirmationInput.autocomplete = 'off';
    confirmationInput.placeholder = action.confirmationText ?? '';

    swal({
      title: action.description,
      text: action.confirmationText
        ? `Nhập chính xác "${action.confirmationText}" để tiếp tục.`
        : `Bạn có muốn ${action.description} không?`,
      icon: 'warning',
      content: action.confirmationText ? (confirmationInput as any) : undefined,
      buttons: ['Không', 'Thực hiện'],
      dangerMode: true,
    }).then((value) => {
      if (value) {
        if (
          action.confirmationText &&
          confirmationInput.value.trim() !== action.confirmationText
        ) {
          toast.error('Xác nhận không khớp. Thao tác đã bị hủy.', {
            duration: 4000,
            position: 'top-right',
          });
          return;
        }
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
                confirmationText: 'HUY TOAN BO CHECKIN',
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
