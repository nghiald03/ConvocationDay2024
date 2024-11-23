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
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { checkinAPI, ledAPI } from '@/config/axios';
import { Bachelor } from '@/dtos/BachelorDTO';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useDebounce } from 'use-debounce';

export default function Page() {
  const queryClient = useQueryClient();
  const DEFAULT_PAGE_SIZE = 20;
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [searchTextQuery] = useDebounce(search, 700);
  const [hall, setHall] = useState('-1');
  const [session, setSession] = useState('-1');
  const [bachelorList, setBachelorList] = useState<Bachelor[]>([]);

  const {
    data: bachelorDT,
    error: bachelorDTEr,
    isLoading,
  } = useQuery({
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
      if (searchTextQuery !== '') {
        return checkinAPI.getBachelorList({
          pageIndex: pageIndex,
          pageSize: pageSize,
          search: searchTextQuery,
          hall: hall,
          session: session,
        });
      }
      return checkinAPI.getBachelorList({
        pageIndex: pageIndex,
        pageSize: pageSize,
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
    if (hallListEr) {
      toast.error('Lỗi khi lấy danh sách hội trường', {
        duration: 5000,
        position: 'top-right',
      });
    }
  }, [hallListEr]);

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
      cell: ({ row }) => (
        <p>
          {row.getValue('sessionNum') === 100
            ? 'Session bù sáng'
            : row.getValue('sessionNum') === 111
            ? 'Session bù chiều'
            : row.getValue('sessionNum')}
        </p>
      ),
    },
    {
      accessorKey: 'chair',
      header: 'Ghế',
    },
    {
      accessorKey: 'chairParent',
      header: 'Ghế phụ huynh',
    },
  ];

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['bachelorList'] });
  }, [hall, session, searchTextQuery, pageIndex, pageSize]);

  const isDesktop = useMediaQuery('(min-width: 1280px)');
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
                  <BreadcrumbPage>
                    Danh sách tân cử nhân tham gia session bù
                  </BreadcrumbPage>
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
                <BreadcrumbPage>
                  Danh sách tân cử nhân tham gia session bù
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </CardContent>
      </Card>

      <Card className='mt-3 animate-fade-up'>
        <CardContent className='p-3'>
          <TableCustom
            title='Danh sách tân cử nhân tham gia session bù'
            isLoading={isLoading}
            data={bachelorList.filter(
              (item) =>
                item.sessionNum.toString() === '100' ||
                item.sessionNum.toString() === '111'
            )}
            columns={columns}
            header={
              isDesktop ? (
                <div className='flex gap-2 w-full'>
                  <Input
                    className='w-[400px] h-full'
                    placeholder='Tìm kiếm theo tên hoặc mã sinh viên'
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <Select onValueChange={setHall}>
                    <SelectTrigger color='primary' className='w-[180px]'>
                      <SelectValue
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
                  <Select onValueChange={setSession}>
                    <SelectTrigger className='w-[180px]'>
                      <SelectValue placeholder='Chọn session' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value='-1' key='all'>
                          Toàn bộ session
                        </SelectItem>
                        <SelectItem value='101'>Session bù sáng</SelectItem>
                        <SelectItem value='111'>Session bù chiều</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant='outline' color='primary' size='icon'>
                      <Icon icon={'line-md:menu'}></Icon>
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Lọc dữ liệu</SheetTitle>
                      <SheetDescription></SheetDescription>
                    </SheetHeader>
                    <div className='flex flex-col gap-2 w-full'>
                      <Input
                        className='w-full h-full'
                        placeholder='Tìm kiếm theo tên hoặc mã sinh viên'
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <Select onValueChange={setHall}>
                        <SelectTrigger color='primary' className='w-full'>
                          <SelectValue
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
                                <SelectItem
                                  key={item.hallId}
                                  value={item.hallId}
                                >
                                  {item.hallName}
                                </SelectItem>
                              ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <Select onValueChange={setSession}>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Chọn session' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value='-1' key='all'>
                              Toàn bộ session
                            </SelectItem>
                            <SelectItem value='101'>Session bù sáng</SelectItem>
                            <SelectItem value='111'>
                              Session bù chiều
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    <SheetFooter></SheetFooter>
                  </SheetContent>
                </Sheet>
              )
            }
          />
        </CardContent>
      </Card>
    </>
  );
}
