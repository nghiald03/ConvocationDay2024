'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import React, { useState } from 'react';

import TableCustom from '@/components/table/table';
import { ColumnDef } from '@tanstack/react-table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Eye, SquarePen, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/icon';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export type DataProps = {
  id: string | number;
  name: string;
  detail: string;
  expandedContent?: React.ReactNode;
  action: React.ReactNode;
};

export default function Page() {
  const [search, setSearch] = useState('');
  const columns: ColumnDef<DataProps>[] = [
    {
      id: 'select',
      size: 3,
      cell: ({ row }) => (
        <div className=''>
          <Button
            variant={'ghost'}
            size='sm'
            onClick={() => row.toggleExpanded()}
            className='hover:bg-white hover:text-primary'
          >
            <Icon
              icon={
                row.getIsExpanded() ? 'ic:outline-remove' : 'ic:outline-add'
              }
            />
          </Button>
        </div>
      ),
    },

    {
      accessorKey: 'name',
      header: 'Tên',
      cell: ({ row }) => <span>{row.getValue('name')}</span>,
    },
    {
      accessorKey: 'detail',
      header: 'Chi tiết',
      cell: ({ row }) => <span>{row.getValue('detail')}</span>,
    },
    {
      id: 'actions',
      header: 'Hành Động',

      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='outline'
                  size='icon'
                  className='w-7 h-7 text-default-400'
                >
                  <Eye className='w-4 h-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent side='top'>
                <p>Xem</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='outline'
                  size='icon'
                  className='w-7 h-7 text-default-400'
                >
                  <SquarePen className='w-3 h-3' />
                </Button>
              </TooltipTrigger>
              <TooltipContent side='top'>
                <p>Sửa</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='outline'
                  size='icon'
                  className='w-7 h-7 text-default-400'
                >
                  <Trash2 className='w-4 h-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side='top'
                className='bg-destructive text-destructive-foreground'
              >
                <p>Xóa</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
  ];

  // Tạo dữ liệu giả cho các chuồng
  const data = [
    {
      id: 1,
      name: 'Chuồng A',
      detail: 'Chuồng cho bò',
      action: 'Xem chi tiết',
      expandedContent: (
        <>
          <Accordion type='single' collapsible className='w-full '>
            <AccordionItem value='item-1'>
              <AccordionTrigger>Danh sách cảm biến</AccordionTrigger>
              <AccordionContent className=''>
                Journalist call this critical, introductory section the and when
                bridge properly executed, it is the that carries your reader
                from anheadine try at attention-grabbing to the body of your
                blog post.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value='item-3'>
              <AccordionTrigger>Danh sách thiết bị điều khiển</AccordionTrigger>
              <AccordionContent>
                Journalist call this critical, introductory section the and when
                bridge properly executed, it is the that carries your reader
                from anheadine try at attention-grabbing to the body of your
                blog post.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </>
      ),
    },
    {
      id: 2,
      name: 'Chuồng B',
      detail: 'Chuồng cho gà',
      action: 'Xem chi tiết',
    },
    {
      id: 3,
      name: 'Chuồng C',
      detail: 'Chuồng cho lợn',
      action: 'Xem chi tiết',
    },
    {
      id: 4,
      name: 'Chuồng D',
      detail: 'Chuồng cho cừu',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
    {
      id: 5,
      name: 'Chuồng E',
      detail: 'Chuồng cho ngựa',
      action: 'Xem chi tiết',
    },
  ];
  return (
    <>
      <Card>
        <CardHeader>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Quản lí</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Chuồng trại</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </CardHeader>
        <CardContent>
          <TableCustom
            data={data}
            columns={columns}
            title='Danh sách chuồng trại'
          ></TableCustom>
        </CardContent>
      </Card>
    </>
  );
}
