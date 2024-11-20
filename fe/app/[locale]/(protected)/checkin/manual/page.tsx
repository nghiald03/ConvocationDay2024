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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { checkinAPI, ledAPI, manageAPI } from '@/config/axios';
import { Bachelor } from '@/dtos/BachelorDTO';
import { Icon } from '@iconify/react/dist/iconify.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Eye, SquarePen, Trash2 } from 'lucide-react';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import swal from 'sweetalert';

export default function Page() {
  const queryClient = useQueryClient();
  const [bachelorList, setBachelorList] = useState<Bachelor[]>([]);
  const {
    data: bachelorDT,
    error: bachelorDTEr,
    isLoading,
  } = useQuery({
    queryKey: ['bachelorList'],
    queryFn: () => {
      return checkinAPI.getBachelorList();
    },
  });

  const { data: hallList, error: hallListEr } = useQuery({
    queryKey: ['hallList'],
    queryFn: () => {
      return ledAPI.getHallList();
    },
  });

  const { data: sessionList, error: sessionListEr } = useQuery({
    queryKey: ['sessionList'],
    queryFn: () => {
      return ledAPI.getSessionList();
    },
  });

  useEffect(() => {
    if (hallListEr) {
      toast.error('Lỗi khi lấy danh sách hội trường', {
        duration: 5000,
        position: 'top-right',
      });
    }
  }, [hallListEr]);

  useEffect(() => {
    if (sessionListEr) {
      toast.error('Lỗi khi lấy danh sách session', {
        duration: 5000,
        position: 'top-right',
      });
    }
  }, [sessionListEr]);

  useEffect(() => {
    if (bachelorDTEr) {
      toast.error('Lỗi khi lấy danh sách tân cử nhân', {
        duration: 3000,
        position: 'top-right',
      });
    }
  }, [bachelorDTEr]);

  useEffect(() => {
    if (bachelorDT?.data) {
      setBachelorList(bachelorDT.data.data.items);
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
    onError: (error) => {
      // toast.error(`Checkin thất bại`, {
      //   duration: 3000,
      //   position: 'top-right',
      //   important: true,
      // });
    },
    onSuccess: (data, variables) => {
      console.log('onSuccess', variables);
      // toast.success(`Checkin cho ${variables.fullName} thành công`, {
      //   duration: 3000,
      //   position: 'top-right',
      // });
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
        // checkinAction.mutate(data);
        toast.promise(
          checkinAction.mutateAsync(data),
          {
            loading: 'Đang checkin...',
            success: `Checkin cho ${data.fullName} thành công`,
            error: `Checkin cho ${data.fullName} thất bại hoặc session chưa mở hoặc kết thúc!`,
          },
          { position: 'top-right', duration: 3000 }
        );
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
            color='primary'
            onClick={() => {
              handleCheckin(row.original);
            }}
          ></Switch>
        </p>
      ),
    },
  ];

  if (isLoading) {
    return (
      <>
        <Card className='animate-fade-up'>
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
          <CardContent className='p-3 '>
            <div className='flex flex-1 w-full p-20'>
              <div className='loader p-10'></div>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <Card className='animate-fade-up'>
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

      <Card className='mt-3 animate-fade-up'>
        <CardContent className='p-3'>
          <TableCustom
            title='Danh sách tân cử nhân'
            isLoading={isLoading}
            data={bachelorList}
            columns={columns}
            header={
              <div className='flex gap-2 w-full'>
                <Input
                  className='w-[400px]'
                  placeholder='Tìm kiếm theo tên hoặc mã sinh viên'
                ></Input>
                <Select>
                  <SelectTrigger color='primary' className='w-[180px]'>
                    <SelectValue
                      color='primary'
                      placeholder='Chọn hội trường'
                    />
                  </SelectTrigger>
                  <SelectContent color='primary'>
                    <SelectGroup>
                      <SelectLabel>Hội Trường</SelectLabel>
                      <SelectItem value='ALL' key='all'>
                        Toàn bộ hội trường
                      </SelectItem>
                      {hallList &&
                        Array.isArray(hallList?.data.data) &&
                        hallList.data.data.map((item: any) => (
                          <SelectItem key={item.hallId} value={item.hallId}>
                            {item.hallName}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger className='w-[180px]'>
                    <SelectValue placeholder='Chọn session' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Session</SelectLabel>
                      <SelectItem value='ALL' key='all'>
                        Toàn bộ session
                      </SelectItem>
                      {sessionList &&
                        Array.isArray(sessionList?.data.data) &&
                        sessionList.data.data.map((item: any) => (
                          <SelectItem
                            key={item.sessionId}
                            value={item.sessionId}
                          >
                            {item.session1}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            }
          ></TableCustom>
        </CardContent>
      </Card>
    </>
  );
}
