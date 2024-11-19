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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { checkinAPI } from '@/config/axios';
import { Bachelor } from '@/dtos/BachelorDTO';
import { expectedHeaders } from '@/lib/constant';
import { cn } from '@/lib/utils';
import { Icon } from '@iconify/react/dist/iconify.js';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import AddBachelorFromFile from './components/addBachelorFromFile';

export default function Page() {
  const [bachelorList, setBachelorList] = useState<Bachelor[]>([]);

  const { data: bachelorDT } = useQuery({
    queryKey: ['bachelorList'],
    queryFn: () => {
      return checkinAPI.getBachelorList();
    },
  });

  useEffect(() => {
    if (bachelorDT?.data) {
      setBachelorList(bachelorDT.data.data.items);
    }
  }, [bachelorDT]);

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([expectedHeaders]);
    XLSX.utils.book_append_sheet(wb, ws, 'TCN');
    XLSX.writeFile(wb, 'data_mau.xlsx');
  };

  const columns: ColumnDef<Bachelor[]>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
    },
    {
      accessorKey: 'image',
      header: 'Image',
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
      id: 'action',
      header: 'Hành động',

      cell: ({ row }) => (
        <div className='flex gap-1'>
          <Button variant='outline' color='primary' className='' size='icon'>
            <Icon icon='line-md:edit-filled'></Icon>
          </Button>
          <Button
            variant='outline'
            color='destructive'
            size='icon'
            className=''
          >
            <Icon icon='material-symbols:delete-outline'></Icon>
          </Button>
        </div>
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
                <BreadcrumbPage>Quản lí danh sách TCN</BreadcrumbPage>
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
            header={
              <>
                <div className='flex gap-2'>
                  <Button
                    variant='default'
                    color='primary'
                    className=''
                    onClick={() => {
                      console.log('click');
                    }}
                  >
                    Thêm một TCN
                  </Button>

                  <AddBachelorFromFile />
                  <Button
                    variant='outline'
                    color='primary'
                    className=''
                    onClick={() => {
                      handleDownloadTemplate();
                    }}
                  >
                    Tải file mẫu
                  </Button>
                </div>
              </>
            }
          />
        </CardContent>
      </Card>
    </>
  );
}
