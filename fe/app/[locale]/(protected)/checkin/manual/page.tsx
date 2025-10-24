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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';
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

  // Set MSSV đang xử lý để disable switch theo từng hàng
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // ---- Fetch list, rút gọn queryFn
  const { data: bachelorDT, isLoading } = useQuery({
    queryKey: [
      'bachelorList',
      pageIndex,
      pageSize,
      hall,
      session,
      searchTextQuery,
    ],
    queryFn: () => {
      const params: any = { pageIndex, pageSize };
      if (hall !== '-1') params.hall = hall;
      if (session !== '-1') params.session = session;
      if (searchTextQuery) params.search = searchTextQuery;
      return checkinAPI.getBachelorList(params);
    },

    refetchOnWindowFocus: false,
  });

  const { data: hallList, error: hallListEr } = useQuery({
    queryKey: ['hallList'],
    queryFn: () => ledAPI.getHallList(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: sessionList } = useQuery({
    queryKey: ['sessionList'],
    queryFn: () => ledAPI.getSessionList(),
    staleTime: 5 * 60 * 1000,
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
    const res = bachelorDT?.data?.data;
    if (res?.items && Array.isArray(res.items)) {
      if (res.items.length === 0) {
        toast.error('Không tìm thấy tân cử nhân', {
          duration: 3000,
          position: 'top-right',
        });
      }
      setBachelorList(res.items);
      setPageIndex(res.currentPage ?? pageIndex);
      setPageSize(res.pageSize ?? pageSize);
    } else {
      setBachelorList([]);
    }
  }, [bachelorDT]);

  // ---- Checkin
  const checkinAction = useMutation({
    mutationFn: async (payload: { studentCode: string; status: boolean }) => {
      return checkinAPI.checkin(payload);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['bachelorList'] });
    },
  });

  const handleCheckin = async (row: any) => {
    const studentCode: string = row.studentCode;

    const confirm = await swal({
      title: 'Checkin',
      text: `Bạn có muốn checkin cho tân cử nhân ${row.fullName} không?`,
      icon: 'warning',
      buttons: ['Không', 'Checkin'],
      dangerMode: true,
    });

    if (!confirm) return;

    // Disable switch của MSSV này
    setProcessingIds((prev) => new Set(prev).add(studentCode));

    try {
      const nData = { studentCode, status: !row.checkIn };
      await toast.promise(
        checkinAction.mutateAsync(nData),
        {
          loading: 'Đang checkin...',
          success: `Checkin cho ${row.fullName} thành công`,
          error: (err: any) => {
            const msg = err?.response?.data ?? 'Lỗi không xác định';
            if (msg === 'Tân cử nhân đã bỏ lỡ session này') {
              setMSSV(studentCode);
              setError(msg);
            }
            return `Không thể checkin vì ${msg}`;
          },
        },
        { position: 'top-right', duration: 3000 }
      );
    } finally {
      // Gỡ disable dù thành công hay lỗi
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(studentCode);
        return next;
      });
    }
  };

  // ---- Đăng ký session bù
  const updateBachelorMissingSession = useMutation({
    mutationFn: () => {
      return checkinAPI.UpdateBachelorToTempSession(
        mssv,
        sessionBachelor === '1'
      );
    },
    onSuccess: () => {
      toast.success(`Đăng kí thành công`, {
        duration: 3000,
        position: 'top-right',
      });
      queryClient.invalidateQueries({ queryKey: ['bachelorList'] });
    },
    onError: () => {
      toast.error(`Đăng kí thất bại`, {
        duration: 3000,
        position: 'top-right',
      });
    },
  });

  const handleUpdateBachelorMissingSession = () => {
    toast.promise(
      updateBachelorMissingSession.mutateAsync(),
      {
        loading: 'Đang đăng kí...',
        success: (data: any) => {
          const d = data?.data?.data;
          swal({
            title: 'Đăng kí tham gia trao bằng tốt nghiệp bổ sung',
            text: `Tân cử nhân ${d?.fullName} với MSSV ${
              d?.studentCode
            } số ghế mới là ${d?.chair} và ghế phụ huynh là ${
              d?.chairParent
            } vào khoảng ${
              d?.chairParent === 100 ? '10H00' : '16H00'
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

  useEffect(() => {
    if (error) {
      swal({
        title: 'Đăng kí tham gia trao bằng tốt nghiệp bổ sung',
        text: `Bạn có muốn đăng kí tham gia trao bằng tốt nghiệp bổ sung không? Lưu ý: Phiên phát bằng bổ sung có hai phiên vào buổi sáng khoảng 10h00 và buổi chiều khoảng 16h00. Vui lòng chọn phiên phù hợp.`,
        icon: 'warning',
        buttons: ['Không', 'Đăng kí'],
      }).then((ok) => {
        if (ok) {
          setApplying(true);
          setError(null);
        }
      });
    }
  }, [error]);

  const columns: ColumnDef<any>[] = useMemo(
    () => [
      { accessorKey: 'id', header: 'ID' },
      { accessorKey: 'fullName', header: 'Tên' },
      { accessorKey: 'studentCode', header: 'MSSV' },
      { accessorKey: 'mail', header: 'Mail' },
      { accessorKey: 'hallName', header: 'Hội trường' },
      {
        accessorKey: 'sessionNum',
        header: 'Session',
        cell: ({ row }) => {
          const v = row.getValue<number>('sessionNum');
          return (
            <p>
              {v === 100
                ? 'Session bù sáng'
                : v === 111
                ? 'Session bù chiều'
                : v}
            </p>
          );
        },
      },
      { accessorKey: 'chair', header: 'Ghế' },
      { accessorKey: 'chairParent', header: 'Ghế phụ huynh' },
      {
        accessorKey: 'checkIn',
        header: 'Checkin',
        cell: ({ row }) => {
          const sc = row.original.studentCode as string;
          const isProcessing =
            processingIds.has(sc) || updateBachelorMissingSession.isPending;
          return (
            <Switch
              checked={row.getValue<boolean>('checkIn')}
              disabled={isProcessing}
              onCheckedChange={() => handleCheckin(row.original)}
            />
          );
        },
      },
    ],
    [processingIds, updateBachelorMissingSession.isPending]
  );

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
                      {Array.isArray(hallList?.data?.data) &&
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
                      {Array.isArray(sessionList?.data?.data) &&
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
                variant='ghost'
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
              onClick={handleUpdateBachelorMissingSession}
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
