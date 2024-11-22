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
import { checkinAPI, ledAPI } from '@/config/axios';
import { Bachelor } from '@/dtos/BachelorDTO';
import { expectedHeaders } from '@/lib/constant';
import { Icon } from '@iconify/react/dist/iconify.js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';
import * as XLSX from 'xlsx';
import AddBachelorFromFile from './components/addBachelorFromFile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import toast from 'react-hot-toast';

export default function Page() {
  const queryClient = useQueryClient();
  const [bachelorList, setBachelorList] = useState<Bachelor[]>([]);
  const DEFAULT_PAGE_SIZE = 10;
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [searchTextQuery] = useDebounce(search, 700);
  const [hall, setHall] = useState('-1');
  const [session, setSession] = useState('-1');
  const { data: bachelorDT, error: bachelorDTEr } = useQuery({
    queryKey: ['bachelorList'],
    queryFn: () => {
      if (hall === '-1') {
        if (session === '-1') {
          return checkinAPI.getBachelorList({
            pageIndex: pageIndex,
            pageSize: pageSize,
            search: searchTextQuery,
          });
        }
        return checkinAPI.getBachelorList({
          pageIndex: pageIndex,
          pageSize: pageSize,
          session: session,
          search: searchTextQuery,
        });
      } else if (session === '-1') {
        if (hall === '-1') {
          return checkinAPI.getBachelorList({
            pageIndex: pageIndex,
            pageSize: pageSize,
            search: searchTextQuery,
          });
        }
        return checkinAPI.getBachelorList({
          pageIndex: pageIndex,
          pageSize: pageSize,
          hall: hall,
          search: searchTextQuery,
        });
      }
      return checkinAPI.getBachelorList({
        pageIndex: pageIndex,
        pageSize: pageSize,
        search: searchTextQuery,
        hall: hall,
        session: session,
      });
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
    if (bachelorDT?.data?.data) {
      if (
        bachelorDT?.data?.data?.items &&
        bachelorDT.data.data.items.length === 0
      ) {
        toast.error('Không tìm thấy tân cử nhân', {
          duration: 3000,
          position: 'top-right',
        });
        setBachelorList([]);
        return;
      }

      setBachelorList(bachelorDT.data.data.items);
      setPageIndex(bachelorDT.data.data.currentPage);
      setPageSize(bachelorDT.data.data.pageSize);
    } else {
      toast.error('Không tìm thấy tân cử nhân', {
        duration: 3000,
        position: 'top-right',
      });
      setBachelorList([]);
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

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['bachelorList'] });
  }, [hall, session, searchTextQuery, pageIndex, pageSize]);

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
            pageIndex={pageIndex}
            pageSize={pageSize}
            setPageSize={setPageSize}
            setPageIndex={setPageIndex}
            totalItems={bachelorDT?.data?.data?.totalItems}
            totalPages={bachelorDT?.data?.data?.totalPages}
            hasNextPage={bachelorDT?.data?.data?.hasNextPage}
            hasPreviousPage={bachelorDT?.data?.data?.hasPreviousPage}
            header={
              <>
                <div className='flex gap-1 w-full h-[40px]'>
                  <Input
                    className='w-[300px] h-full'
                    placeholder='Tìm kiếm theo tên hoặc mã sinh viên'
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <div className='h-full'>
                    <Select onValueChange={setHall}>
                      <SelectTrigger color='primary' className='w-[170px] '>
                        <SelectValue
                          className=' h-full'
                          color='primary'
                          placeholder='Chọn hội trường'
                        />
                      </SelectTrigger>
                      <SelectContent color='primary'>
                        <SelectGroup>
                          <SelectLabel>Hội Trường</SelectLabel>
                          <SelectItem value='-1' key='all'>
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
                  </div>

                  <Select onValueChange={setSession}>
                    <SelectTrigger className='w-[180px]'>
                      <SelectValue placeholder='Chọn session' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Session</SelectLabel>
                        <SelectItem value='-1' key='all'>
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant='outline'
                        className='h-full'
                        color='primary'
                      >
                        Thêm tân cử nhân
                        <Icon
                          icon='heroicons:chevron-right'
                          className=' h-4 w-4 ms-2 rtl:rotate-180 '
                        />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align='start'
                      className='flex-col gap-0'
                    >
                      <DropdownMenuItem className='p-0'>
                        <Button
                          className='w-full flex justify-start'
                          size='md'
                          variant={'outline'}
                        >
                          Thêm một tân cử nhân
                        </Button>
                      </DropdownMenuItem>
                      <DropdownMenuItem className='p-0' asChild>
                        <AddBachelorFromFile />
                      </DropdownMenuItem>
                      <DropdownMenuItem className='p-0'>
                        <Button
                          className='w-full flex justify-start'
                          size='md'
                          variant={'outline'}
                          onClick={() => {
                            handleDownloadTemplate();
                          }}
                        >
                          Tải file mẫu
                        </Button>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            }
          />
        </CardContent>
      </Card>
    </>
  );
}
