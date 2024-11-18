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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { checkinAPI } from '@/config/axios';
import { Bachelor } from '@/dtos/BachelorDTO';
import { Icon } from '@iconify/react/dist/iconify.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Eye, SquarePen, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import swal from 'sweetalert';

export default function Page() {
  const queryClient = useQueryClient();
  const [bachelorList, setBachelorList] = useState<Bachelor[]>([]);
  const { data: bachelorDT, error: bachelorDTEr } = useQuery({
    queryKey: ['bachelorList'],
    queryFn: () => {
      return checkinAPI.getBachelorList();
    },
  });

  useEffect(() => {
    if (bachelorDT?.data) {
      setBachelorList(bachelorDT.data.data);
    }
  }, [bachelorDT]);

  const checkinAction = useMutation({
    mutationFn: (data: any) => {
      const nData = {
        studentCode: data.studentCode,
        status: !data.checkIn,
      };
      console.log(nData);
      return checkinAPI.checkin(nData);
    },
    onMutate: (data: any) => {
      console.log('onMutate', data);
    },
    onError: (error) => {
      toast.error(`Checkin thất bại`, {
        duration: 3000,
        position: 'top-right',
      });
    },
    onSuccess: (data, variables) => {
      console.log('onSuccess', variables);
      toast.success(`Checkin cho ${variables.fullName} thành công`, {
        duration: 3000,
        position: 'top-right',
      });
      queryClient.invalidateQueries({ queryKey: ['bachelorList'] });
    },
  });

  const handleCheckin = (data: any) => {
    swal({
      title: `Checkin`,
      text: `Bạn có muốn checkin cho tân cử nhân ${data.fullName} không?`,
      icon: 'warning',
      buttons: ['Không', 'Checkin'],
      dangerMode: true,
    }).then((value) => {
      if (value) {
        checkinAction.mutate(data);
      }
    });
  };

  const columns: ColumnDef<Bachelor[]>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
    },
    {
      accessorKey: 'fullName',
      header: 'Tên',
    },
    {
      accessorKey: 'studentCode',
      header: 'MSSV',
    },
    {
      accessorKey: 'mail',
      header: 'Mail',
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
      accessorKey: 'chair',
      header: 'Ghế',
    },
    {
      accessorKey: 'chairParent',
      header: 'Ghế phụ huynh',
    },
    {
      accessorKey: 'checkIn',
      header: 'checkin',

      cell: ({ row }) => (
        <p>
          <Switch
            checked={row.getValue('checkIn')}
            onClick={() => {
              handleCheckin(row.original);
            }}
          ></Switch>
        </p>
      ),
    },
  ];

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
                <BreadcrumbPage>Checkin thủ công</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </CardContent>
      </Card>

      <Card className='mt-3'>
        <CardContent className='p-3'>
          <TableCustom
            title='Danh sách tân cử nhân'
            data={bachelorList}
            columns={columns}
          ></TableCustom>
        </CardContent>
      </Card>
    </>
  );
}
