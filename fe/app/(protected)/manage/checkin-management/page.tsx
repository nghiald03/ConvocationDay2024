'use client';
import TableCustom from '@/components/table/table';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { manageAPI } from '@/config/axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import swal from 'sweetalert';

export default function Page() {
  const queryClient = useQueryClient();
  const [checkinsList, setCheckinList] = useState<any[]>([]);
  const { data: checkinList } = useQuery({
    queryKey: ['checkinList'],
    queryFn: () => {
      return manageAPI.getCheckinList();
    },
  });
  const checkinAction = useMutation({
    mutationFn: (data: any) => {
      const nData = {
        checkinId: data.checkinId,
        status: !data.status,
      };
      console.log(nData);
      return manageAPI.updateStatusCheckin(nData);
    },

    onSuccess: (data, variables) => {
      console.log('onSuccess', variables);
      // toast.success(`Checkin cho ${variables.fullName} thành công`, {
      //   duration: 3000,
      //   position: 'top-right',
      // });
      queryClient.invalidateQueries({ queryKey: ['checkinList'] });
    },
  });

  const handleCheckin = (data: any) => {
    swal({
      title: `Thay đổi trạng thái checkin`,
      text: `Bạn có muốn thay đổi trạng thái checkin của hội trường ${data.hallName} session ${data.sessionNum} không?`,
      icon: 'warning',
      buttons: ['Không', 'Thay đổi'],
      dangerMode: true,
    }).then((value) => {
      if (value) {
        // checkinAction.mutate(data);
        toast.promise(
          checkinAction.mutateAsync(data),
          {
            loading: 'Đang thay đổi trạng thái...',
            success: `Thay trạng thái checkin của hội trường ${data.hallName} session ${data.sessionNum} thành công!`,
            error: `Không thể thay đồi trạng thái checkin của hội trường ${data.hallName} session ${data.sessionNum}!`,
          },
          { position: 'top-right', duration: 3000 }
        );
      }
    });
  };

  const columns: ColumnDef<any[]>[] = [
    {
      accessorKey: 'checkinId',
      header: 'ID',
    },
    {
      accessorKey: 'hallName',
      header: 'Hội trường',
    },
    {
      accessorKey: 'sessionNum',
      header: 'Session',
    },

    {
      accessorKey: 'status',
      header: 'Action',

      cell: ({ row }) => (
        <p>
          <Switch
            checked={row.getValue('status')}
            onClick={() => {
              handleCheckin(row.original);
            }}
            color='primary'
          ></Switch>
        </p>
      ),
    },
  ];

  useEffect(() => {
    if (checkinList) {
      setCheckinList(checkinList.data.data);
    }
  }, [checkinList]);
  return (
    <>
      <Card>
        <CardContent className='p-3'>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href='/'>Trang chủ</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Quản lí </BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Quản lí checkin</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </CardContent>
      </Card>

      <Card className='mt-3'>
        <CardContent className='p-3'>
          <TableCustom
            title='Danh sách session trao bằng'
            data={checkinsList}
            columns={columns}
          ></TableCustom>
        </CardContent>
      </Card>
    </>
  );
}
