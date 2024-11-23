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
} from '@/components/ui/dialog';
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
import { Switch } from '@/components/ui/switch';
import { checkinAPI, ledAPI } from '@/config/axios';
import { Bachelor } from '@/dtos/BachelorDTO';
import { DialogTrigger } from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { set } from 'lodash';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import swal from 'sweetalert';
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
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [mssv, setMSSV] = useState('');
  const [sessionBachelor, setSessionBachelor] = useState<string | null>(null);
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
            error: (error) => {
              console.log(error);
              if (error.response.data === 'Tân cử nhân đã bỏ lỡ session này') {
                setMSSV(data.studentCode);
                setError(error.response.data);
              }
              return `Không thể checkin vì ${error.response.data}`;
            },
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

  useEffect(() => {
    if (error) {
      swal({
        title: 'Đăng kí tham gia trao bằng tốt nghiệp bổ sung',
        text: `Bạn có muốn đăng kí tham gia trao bằng tốt nghiệp bổ sung không? Lưu ý: Phiên phát bằng bổ sung có hai phiên vào buổi sáng khoảng 10h00 và buổi chiều khoảng 16h00. Vui lòng chọn phiên phù hợp.`,
        icon: 'warning',
        buttons: ['Không', 'Đăng kí'],
      }).then((value) => {
        if (value) {
          setApplying(true);
          setError(null);
          console.log('OPEN DIALOG');
        }
      });
    }
  }, [error]);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['bachelorList'] });
  }, [hall, session, searchTextQuery, pageIndex, pageSize]);

  const updateBachelorMissingSession = useMutation({
    mutationFn: () => {
      if (sessionBachelor === '1')
        return checkinAPI.UpdateBachelorToTempSession(mssv, true);
      return checkinAPI.UpdateBachelorToTempSession(mssv, false);
    },
    onError: (error) => {
      toast.error(`Đăng kí thất bại`, {
        duration: 3000,
        position: 'top-right',
      });
    },
    onSuccess: (data, variables) => {
      console.log('onSuccess', variables);
      toast.success(`Đăng kí thành công`, {
        duration: 3000,
        position: 'top-right',
      });
      queryClient.invalidateQueries({ queryKey: ['bachelorList'] });
    },
  });

  const handleUpdateBachelorMissingSession = () => {
    toast.promise(
      updateBachelorMissingSession.mutateAsync(),
      {
        loading: 'Đang đăng kí...',
        success: (data) => {
          console.log(data);
          swal({
            title: 'Đăng kí tham gia trao bằng tốt nghiệp bổ sung',
            text: `Tân cử nhân ${data.data.data.fullName} với MSSV ${
              data.data.data.studentCode
            } số ghế mới là ${data.data.data.chair} và ghế phụ huynh là ${
              data.data.data.chairParent
            } vào khoảng ${
              data.data.data.chairParent === 100 ? '10H00' : '16H00'
            } để checkin lại .`,
            icon: 'success',
            buttons: ['Đã biết'],
          });
          return 'Đăng kí thành công';
        },
        error: `Không thể đăng kí`,
      },
      { position: 'top-right', duration: 6000 }
    );

    setApplying(false);
  };

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
            pageIndex={pageIndex}
            pageSize={pageSize}
            setPageSize={setPageSize}
            setPageIndex={setPageIndex}
            totalItems={bachelorDT?.data?.data?.totalItems}
            totalPages={bachelorDT?.data?.data?.totalPages}
            hasNextPage={bachelorDT?.data?.data?.hasNextPage}
            hasPreviousPage={bachelorDT?.data?.data?.hasPreviousPage}
            currentPage={bachelorDT?.data?.data?.currentPage}
            header={
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
              </div>
            }
          />
        </CardContent>
      </Card>
      <Dialog open={applying} onOpenChange={setApplying}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Đăng kí tham gia trao bằng tốt nghiệp bù</DialogTitle>
            <DialogDescription>
              Vui lòng chọn phiên trao bằng cho tân cử nhân có MSSV {mssv}
            </DialogDescription>
          </DialogHeader>
          <Select onValueChange={setSessionBachelor}>
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='Chọn phiên trao bằng' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value='1' key='1'>
                  Phiên trao bằng buổi sáng (10h00)
                </SelectItem>
                <SelectItem value='0' key='2'>
                  Phiên trao bằng buổi chiều (16h00)
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <DialogFooter>
            <DialogClose>
              <Button
                variant={'ghost'}
                onClick={() => {
                  setApplying(false);
                  setError(null);
                }}
                color='primary'
              >
                Hủy
              </Button>
            </DialogClose>
            <Button
              onClick={() => {
                handleUpdateBachelorMissingSession();
              }}
              color='primary'
            >
              Đăng kí
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
