'use client';
import TableCustom from '@/components/table/table';
import { bachelorKeys } from '@/features/bachelor/queries/bachelor-query-options';
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
import { checkInBachelor, forceCheckInBachelor } from '@/features/check-in/api/check-in-bachelor';
import { createClickBurst } from '@/features/check-in/model/click-burst';
import { canCheckInRoom } from '@/features/check-in/model/check-in-room';
import { checkInRoomsQueryOptions } from '@/features/check-in/queries/check-in-rooms-query-options';
import {
  CHECK_IN_LOCK_UNKNOWN_WARNING,
  getCheckInLockWarning,
} from '@/features/check-in/model/get-check-in-lock-warning';
import { showLateCheckInNotice } from '@/features/check-in/ui/show-late-check-in-notice';
import { moveBachelorToTemporarySession } from '@/features/bachelor/api/move-bachelor-to-temporary-session';
import { transferBachelorSession } from '@/features/bachelor/api/transfer-bachelor-session';
import { hallQueryOptions } from '@/features/hall/queries/hall-query-options';
import { sessionQueryOptions } from '@/features/session/queries/session-query-options';
import { getSessionsByHallName } from '@/features/session/api/get-sessions-by-hall-name';
import { Bachelor } from '@/features/bachelor/model/bachelor';
import { getBachelors } from '@/features/bachelor/api/get-bachelors';
import type { BachelorListParams } from '@/features/bachelor/model/bachelor-page';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import swal from 'sweetalert';
import { useDebounce } from 'use-debounce';
import { MultiHallStatusDisplay } from '@/features/led/ui/multi-hall-status-display';
import { useSession } from '@/features/auth/queries/session-provider';
import { canViewForceCode } from '@/features/check-in/model/force-code';
import { ForceCodeBadge } from '@/features/check-in/ui/force-code-badge';

export default function ManualCheckinPage() {
  const queryClient = useQueryClient();
  const showForceCode = canViewForceCode(useSession()?.roles);

  const DEFAULT_PAGE_SIZE = 20;
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [searchTextQuery] = useDebounce(search, 700);
  const [hall, setHall] = useState('-1');
  const [session, setSession] = useState('-1');
  const [room, setRoom] = useState('-1');
  const [roomDefaulted, setRoomDefaulted] = useState(false);

  const [bachelorList, setBachelorList] = useState<Bachelor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [mssv, setMSSV] = useState('');
  const [sessionBachelor, setSessionBachelor] = useState<string | null>(null);

  // Set MSSV đang xử lý để disable switch theo từng hàng
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  // Transfer result dialog state
  const [transferResult, setTransferResult] = useState<any | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  const bachelorListParams = useMemo(() => {
    const params: BachelorListParams = { pageIndex, pageSize };
    if (hall !== '-1') params.hall = hall;
    if (session !== '-1') params.session = session;
    if (room !== '-1') params.checkinRoom = room;
    if (searchTextQuery) params.search = searchTextQuery;
    return params;
  }, [hall, pageIndex, pageSize, room, searchTextQuery, session]);

  // ---- Fetch list, rút gọn queryFn
  const { data: bachelorDT, isLoading } = useQuery({
    queryKey: bachelorKeys.list(bachelorListParams),
    queryFn: () => getBachelors(bachelorListParams),

    refetchOnWindowFocus: false,
  });

  const { data: hallList, error: hallListEr } = useQuery(hallQueryOptions);

  const { data: sessionList } = useQuery(sessionQueryOptions);

  const { data: checkInRooms } = useQuery(checkInRoomsQueryOptions);
  const assignedRooms = checkInRooms?.assignedRooms;
  const roomOptions = assignedRooms ?? checkInRooms?.rooms ?? [];
  const hasNoAssignedRoom = assignedRooms?.length === 0;

  // Tài khoản bị giới hạn phòng mở màn hình là thấy ngay phòng của mình.
  useEffect(() => {
    if (roomDefaulted || !checkInRooms) return;
    setRoomDefaulted(true);
    const firstRoom = checkInRooms.assignedRooms?.[0];
    if (firstRoom) setRoom(firstRoom);
  }, [checkInRooms, roomDefaulted]);

  useEffect(() => {
    if (hallListEr) {
      toast.error('Lỗi khi lấy danh sách side', {
        duration: 5000,
        position: 'top-right',
      });
    }
  }, [hallListEr]);

  useEffect(() => {
    const res = bachelorDT;
    if (res?.items && Array.isArray(res.items)) {
      if (res.items.length === 0) {
        toast.error('Không tìm thấy tân cử nhân', {
          duration: 3000,
          position: 'top-right',
        });
      }
      setBachelorList(res.items);
      setPageIndex((current) => res.currentPage ?? current);
      setPageSize((current) => res.pageSize ?? current);
    } else {
      setBachelorList([]);
    }
  }, [bachelorDT]);

  // ---- Checkin
  const checkinAction = useMutation({
    mutationFn: async (payload: { studentCode: string; status: boolean }) => {
      return checkInBachelor(payload);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: bachelorKeys.lists() });
    },
  });

  const promptTransferToAnotherSession = useCallback(
    async (row: any) => {
      const hallName = row.hallName;
      if (!hallName) {
        toast.error('Không tìm thấy side để chuyển phiên');
        return;
      }

      // Fetch sessions by hall name
      const sessions = await getSessionsByHallName(hallName);
      console.log('sessions', sessions);

      if (!sessions || sessions.length === 0) {
        toast.error('Không tìm thấy phiên khả dụng cho side này');
        return;
      }

      // Build select element for swal
      const select = document.createElement('select');
      select.style.width = '100%';
      sessions.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = String(s.sessionId ?? s.sessionId);
        const label = `Phiên ${s.sessionInDay ?? ''} (Session: ${
          s.sessionNumber ?? ''
        }) ${s.sessionDescription ? '- ' + s.sessionDescription : ''}`;
        opt.text = label;
        select.appendChild(opt);
      });

      const confirm = await swal({
        title: 'Phiên đã đóng — Chuyển phiên',
        text: 'Chọn phiên thay thế cho tân cử nhân',
        content: select as any,
        buttons: ['Hủy', 'Chuyển'],
      });

      if (!confirm) return;

      const newSessionId = Number(select.value);
      if (!newSessionId) {
        toast.error('Phiên không hợp lệ');
        return;
      }

      // Call transfer API and capture response to show dialog
      const transferRes = await toast.promise(
        transferBachelorSession({
          studentCode: row.studentCode,
          newSessionId,
        }),
        {
          loading: 'Đang chuyển phiên...',
          success: 'Chuyển phiên thành công',
          error: 'Không thể chuyển phiên',
        },
        { position: 'top-right', duration: 3000 }
      );

      // Extract payload safely (some APIs wrap in data.data)
      const payload = transferRes;

      if (payload) {
        setTransferResult(payload);
        setTransferDialogOpen(true);
      }

      queryClient.invalidateQueries({ queryKey: bachelorKeys.lists() });
    },
    [queryClient]
  );

  const handleCheckin = useCallback(
    async (row: any) => {
      const studentCode: string = row.studentCode;

      const nextStatus = !row.checkIn;
      const confirmationInput = document.createElement('input');
      confirmationInput.className = 'swal-content__input';
      confirmationInput.placeholder = studentCode;
      confirmationInput.autocomplete = 'off';

      // Đọc trạng thái mới nhất ngay trước khi hỏi vì phiên có thể vừa bị khóa.
      const lockWarning = nextStatus
        ? await getSessionsByHallName(row.hallName)
            .then((sessions) => getCheckInLockWarning(sessions, row.sessionNum))
            .catch(() => CHECK_IN_LOCK_UNKNOWN_WARNING)
        : null;

      const confirm = await swal({
        title: nextStatus ? 'Checkin' : 'Hủy checkin',
        text: nextStatus
          ? [
              `Bạn có muốn checkin cho tân cử nhân ${row.fullName} không?`,
              lockWarning,
            ]
              .filter(Boolean)
              .join('\n\n')
          : `Nhập đúng MSSV ${studentCode} để xác nhận hủy checkin cho ${row.fullName}.`,
        icon: 'warning',
        content: nextStatus ? undefined : (confirmationInput as any),
        buttons: nextStatus ? ['Không', 'Checkin'] : ['Không', 'Hủy checkin'],
        dangerMode: !nextStatus || lockWarning !== null,
      });

      if (!confirm) return;

      if (
        !nextStatus &&
        confirmationInput.value.trim().toLowerCase() !==
          studentCode.toLowerCase()
      ) {
        toast.error('MSSV xác nhận không khớp. Đã giữ nguyên trạng thái checkin.', {
          position: 'top-right',
          duration: 4000,
        });
        return;
      }

      // Disable switch của MSSV này
      setProcessingIds((prev) => new Set(prev).add(studentCode));

      try {
        const nData = {
          studentCode,
          status: nextStatus,
          ...(nextStatus
            ? {}
            : { cancellationConfirmation: confirmationInput.value.trim() }),
        };
        // Prefer explicit mutate + try/catch so we can handle specific 400 messages
        const result = await checkinAction.mutateAsync(nData);
        if (result?.late) {
          await showLateCheckInNotice(result);
        } else {
          toast.success(
            nextStatus
              ? `Checkin cho ${row.fullName} thành công`
              : `Hủy checkin cho ${row.fullName} thành công`,
            {
              position: 'top-right',
              duration: 3000,
            }
          );
        }
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ??
          err?.response?.data ??
          err?.message ??
          '';

        toast.error(`Không thể checkin vì ${msg}`, {
          position: 'top-right',
          duration: 3000,
        });
      } finally {
        // Gỡ disable dù thành công hay lỗi
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(studentCode);
          return next;
        });
      }
    },
    [checkinAction]
  );

  // Force check-in: bỏ qua phiên mở/khóa, server kiểm tra mã khẩn cấp và khoảng cách với LED.
  const handleForceCheckin = useCallback(
    async (row: any) => {
      const studentCode: string = row.studentCode;
      if (row.checkIn) {
        toast.error(`${row.fullName} đã check-in rồi.`, { position: 'top-right', duration: 3000 });
        return;
      }
      const codeInput = document.createElement('input');
      codeInput.className = 'swal-content__input';
      codeInput.autocomplete = 'off';
      codeInput.autocapitalize = 'characters';
      codeInput.spellcheck = false;
      codeInput.maxLength = 4;
      codeInput.placeholder = 'Mã 4 ký tự';
      codeInput.style.textTransform = 'uppercase';
      codeInput.style.letterSpacing = '0.3em';

      const confirm = await swal({
        title: 'Force check-in',
        text: `Check-in khẩn cấp cho ${row.fullName} (${studentCode}) bất kể phiên đang mở hay khóa.\n\nHỏi Check-in Lead hoặc Manager để lấy mã 4 ký tự (đổi sau mỗi 5 phút).`,
        icon: 'warning',
        content: codeInput as any,
        buttons: ['Không', 'Force check-in'],
        dangerMode: true,
      });
      const emergencyCode = codeInput.value.trim();
      if (!confirm || !emergencyCode) return;

      setProcessingIds((prev) => new Set(prev).add(studentCode));
      try {
        const result = await forceCheckInBachelor({ studentCode, emergencyCode });
        toast.success(`Force check-in cho ${row.fullName} thành công. Ghế: ${result?.chair ?? '-'}`, {
          position: 'top-right',
          duration: 4000,
        });
        queryClient.invalidateQueries({ queryKey: bachelorKeys.lists() });
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? err?.message ?? '';
        toast.error(`Không thể force check-in: ${msg}`, { position: 'top-right', duration: 5000 });
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(studentCode);
          return next;
        });
      }
    },
    [queryClient]
  );

  // Nhấn 1 lần: check-in thường (chờ một nhịp để phân biệt). Nhấn nhanh 4 lần: force check-in.
  const switchHandlers = useRef({ single: handleCheckin, burst: handleForceCheckin });
  switchHandlers.current = { single: handleCheckin, burst: handleForceCheckin };
  const handleSwitchClick = useMemo(
    () =>
      createClickBurst<any>({
        count: 4,
        windowMs: 450,
        onSingle: (row) => void switchHandlers.current.single(row),
        onBurst: (row) => void switchHandlers.current.burst(row),
      }),
    []
  );

  // ---- Đăng ký session bù
  const updateBachelorMissingSession = useMutation({
    mutationFn: () => {
      return moveBachelorToTemporarySession(
        mssv,
        sessionBachelor === '1'
      );
    },
    onSuccess: () => {
      toast.success(`Đăng kí thành công`, {
        duration: 3000,
        position: 'top-right',
      });
      queryClient.invalidateQueries({ queryKey: bachelorKeys.lists() });
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
      { accessorKey: 'hallName', header: 'Side' },
      {
        accessorKey: 'sessionNum',
        header: 'Phiên tổng',
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
      { accessorKey: 'sessionInDay', header: 'Phiên theo ngày' },
      { accessorKey: 'chair', header: 'Ghế' },
      { accessorKey: 'chairParent', header: 'Ghế phụ huynh' },
      { accessorKey: 'checkinRoom', header: 'Phòng checkin' },
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
              disabled={
                isProcessing ||
                !canCheckInRoom(assignedRooms, row.original.checkinRoom)
              }
              onCheckedChange={() =>
                handleSwitchClick(row.original.studentCode, row.original)
              }
            />
          );
        },
      },
      {
        id: 'transfer',
        header: 'Chuyển phiên',
        cell: ({ row }) => (
          <Button
            size='sm'
            variant='outline'
            onClick={() => {
              // toast.promise đã hiện lỗi cho người dùng
              promptTransferToAnotherSession(row.original).catch(() => undefined);
            }}
            disabled={
              row.original.checkIn === true ||
              processingIds.has(row.original.studentCode) ||
              !canCheckInRoom(assignedRooms, row.original.checkinRoom)
            }
          >
            Chuyển phiên
          </Button>
        ),
      },
    ],
    [
      processingIds,
      updateBachelorMissingSession.isPending,
      handleSwitchClick,
      promptTransferToAnotherSession,
      assignedRooms,
    ]
  );

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
          <MultiHallStatusDisplay />
          {showForceCode && (
            <div className='mt-3'>
              <ForceCodeBadge />
            </div>
          )}
          {hasNoAssignedRoom && (
            <p className='my-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive'>
              Tài khoản của bạn chưa được phân phòng checkin nên chưa thể checkin. Vui lòng liên hệ quản lý.
            </p>
          )}
          <TableCustom
            title='Danh sách tân cử nhân'
            isLoading={isLoading}
            data={bachelorList}
            columns={columns}
            pageIndex={pageIndex}
            pageSize={pageSize}
            setPageSize={setPageSize}
            setPageIndex={setPageIndex}
            totalItems={bachelorDT?.totalItems}
            totalPages={bachelorDT?.totalPages}
            hasNextPage={bachelorDT?.hasNextPage}
            hasPreviousPage={bachelorDT?.hasPreviousPage}
            currentPage={bachelorDT?.currentPage}
            header={
              <div className='flex gap-2 w-full'>
                <Input
                  size={'md'}
                  placeholder='Tìm kiếm theo tên hoặc mã sinh viên'
                  defaultValue={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Select onValueChange={setHall}>
                  <SelectTrigger color='primary' className='w-[300px]'>
                    <SelectValue
                      color='primary'
                      placeholder='Chọn side'
                    />
                  </SelectTrigger>
                  <SelectContent color='primary'>
                    <SelectGroup>
                      <SelectLabel>Side</SelectLabel>
                      <SelectItem value='-1' key='all'>
                        Toàn bộ side
                      </SelectItem>
                      {hallList?.map((item) => (
                          <SelectItem key={item.hallId} value={String(item.hallId)}>
                            {item.hallName}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Select
                  value={room}
                  onValueChange={(value) => {
                    setRoom(value);
                    setPageIndex(1);
                  }}
                >
                  <SelectTrigger className='w-[260px]'>
                    <SelectValue placeholder='Chọn phòng checkin' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Phòng checkin</SelectLabel>
                      <SelectItem value='-1' key='all'>
                        Toàn bộ phòng
                      </SelectItem>
                      {roomOptions.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Select onValueChange={setSession}>
                  <SelectTrigger className='w-[400px]'>
                    <SelectValue placeholder='Chọn session' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Session</SelectLabel>
                      <SelectItem value='-1' key='all'>
                        Toàn bộ session
                      </SelectItem>
                      {sessionList?.map((item) => (
                          <SelectItem
                            key={item.sessionId}
                            value={String(item.sessionId)}
                          >
                            {item.session1} - {item.sessionInDay} -{' '}
                            {item.description}
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

      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className='sm:max-w-[520px]'>
          <DialogHeader>
            <DialogTitle>Thông tin chuyển phiên</DialogTitle>
            <DialogDescription>
              Kết quả chuyển phiên cho tân cử nhân sau khi chuyển phiên thành
              công.
            </DialogDescription>
          </DialogHeader>

          {transferResult ? (
            <div className='grid grid-cols-1 gap-2 mt-2'>
              <div className='flex justify-between'>
                <span className='font-medium'>MSSV:</span>
                <span>{transferResult.studentCode ?? '-'}</span>
              </div>
              <div className='flex justify-between'>
                <span className='font-medium'>Họ và tên:</span>
                <span>{transferResult.fullName ?? '-'}</span>
              </div>
              <div className='flex justify-between'>
                <span className='font-medium'>Session mới:</span>
                <span>{transferResult.newSession ?? '-'}</span>
              </div>
              <div className='flex justify-between'>
                <span className='font-medium'>Session trong ngày mới:</span>
                <span>{transferResult.newSessionInDay ?? '-'}</span>
              </div>
              <div className='flex justify-between'>
                <span className='font-medium'>Trạng thái điểm danh:</span>
                <span>{transferResult.attendanceStatus ?? '-'}</span>
              </div>
              <div className='flex justify-between'>
                <span className='font-medium'>Số ghế:</span>
                <span>{transferResult.newChair ?? '-'}</span>
              </div>
              <div className='flex justify-between'>
                <span className='font-medium'>Ghế phụ huynh:</span>
                <span>{transferResult.newChairParent ?? '-'}</span>
              </div>
            </div>
          ) : (
            <p>Không có dữ liệu để hiển thị.</p>
          )}

          <DialogFooter>
            <DialogClose>
              <Button
                onClick={() => {
                  setTransferDialogOpen(false);
                  setTransferResult(null);
                }}
                color='primary'
              >
                Đóng
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
