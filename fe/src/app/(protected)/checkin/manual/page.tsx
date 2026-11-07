'use client';
import TableCustom from '@/components/table/table';
import TablePagination from '@/components/table/table-pagination';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
import { IconButton } from '@/components/ui/icon-button';
import { Copy } from 'lucide-react';
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
import {
  checkInBachelor,
  forceCheckInBachelor,
  getCheckInPreview,
} from '@/features/check-in/api/check-in-bachelor';
import { createClickBurst } from '@/features/check-in/model/click-burst';
import { canCheckInRoom } from '@/features/check-in/model/check-in-room';
import { checkInRoomsQueryOptions } from '@/features/check-in/queries/check-in-rooms-query-options';
import { describeCheckInPreview } from '@/features/check-in/model/describe-check-in-preview';
import { showLateCheckInNotice } from '@/features/check-in/ui/show-late-check-in-notice';
import { createEmergencyCodeInput, EMERGENCY_CODE_HINT } from '@/features/check-in/ui/emergency-code-input';
import type { CheckInBachelorInput } from '@/features/check-in/model/check-in';
import { moveBachelorToTemporarySession } from '@/features/bachelor/api/move-bachelor-to-temporary-session';
import {
  transferBachelorSession,
  type TransferReason,
} from '@/features/bachelor/api/transfer-bachelor-session';
import { hallQueryOptions } from '@/features/hall/queries/hall-query-options';
import { sessionQueryOptions } from '@/features/session/queries/session-query-options';
import { getSessionsByHallName } from '@/features/session/api/get-sessions-by-hall-name';
import { Bachelor } from '@/features/bachelor/model/bachelor';
import { getBachelors } from '@/features/bachelor/api/get-bachelors';
import type { BachelorListParams } from '@/features/bachelor/model/bachelor-page';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import toast from '@/lib/toast';
import { copyRichText } from '@/features/check-in/lib/copy-rich-text';
import { buildCheckInReminder } from '@/features/check-in/model/check-in-reminder';
import swal from 'sweetalert';
import { useDebounce } from 'use-debounce';
import { MultiHallStatusDisplay } from '@/features/led/ui/multi-hall-status-display';
import { useSession } from '@/features/auth/queries/session-provider';
import { canViewForceCode } from '@/features/check-in/model/force-code';
import { ForceCodeBadge } from '@/features/check-in/ui/force-code-badge';

/**
 * Hiện nút "Chuyển phiên" trong bảng check-in. Nhân viên check-in phải nhập mã khẩn cấp khi chuyển ca
 * (server kiểm tra), Check-in Lead và Manager thì không.
 */
const SHOW_TRANSFER_COLUMN = true;

function sessionLabel(sessionNum: number | null | undefined) {
  if (sessionNum === 100) return 'Session bù sáng';
  if (sessionNum === 111) return 'Session bù chiều';
  return sessionNum ?? '-';
}

function BachelorCheckinCard({
  bachelor,
  checkinDisabled,
  transferDisabled,
  onCheckin,
  onTransfer,
  onRemind,
}: {
  bachelor: Bachelor;
  checkinDisabled: boolean;
  transferDisabled: boolean;
  onCheckin: () => void;
  onTransfer: () => void;
  /** Chép tin nhắc check-in (dán vào Zalo). */
  onRemind: () => void;
}) {
  const checkedIn = bachelor.checkIn === true;
  const details: [string, React.ReactNode][] = [
    ['Side', bachelor.hallName || '-'],
    ['Phiên', sessionLabel(bachelor.sessionNum)],
    ['Phiên trong ngày', bachelor.sessionInDay ?? '-'],
    ['Phòng', bachelor.checkinRoom || '-'],
    ['Ghế', bachelor.chair || '-'],
    ['Ghế PH', bachelor.chairParent || '-'],
  ];
  return (
    <li
      className={cn(
        'rounded-lg border p-3',
        checkedIn
          ? 'border-green-500/50 bg-green-50 dark:bg-green-950/30'
          : 'border-default-200',
      )}
    >
      <div className='flex items-start justify-between gap-2'>
        <div className='min-w-0'>
          <p className='font-semibold leading-tight break-words'>
            {bachelor.fullName}
          </p>
          <p className='text-sm text-muted-foreground'>
            {bachelor.studentCode}
          </p>
        </div>
        <Badge
          className={cn(
            'shrink-0',
            checkedIn
              ? 'bg-green-600 hover:bg-green-600'
              : 'bg-slate-400 hover:bg-slate-400',
          )}
        >
          {checkedIn ? 'Đã checkin' : 'Chưa checkin'}
        </Badge>
      </div>
      <dl className='mt-2 grid grid-cols-3 gap-x-2 gap-y-1 text-sm'>
        {details.map(([label, value]) => (
          <div key={label} className='min-w-0'>
            <dt className='text-xs text-muted-foreground'>{label}</dt>
            <dd className='truncate font-medium'>{value}</dd>
          </div>
        ))}
      </dl>
      <div className='mt-3 flex gap-2'>
        <Button
          className='h-11 flex-1 text-base'
          variant={checkedIn ? 'outline' : 'default'}
          disabled={checkinDisabled}
          onClick={onCheckin}
        >
          {checkedIn ? 'Hủy checkin' : 'Checkin'}
        </Button>
        {/* Người đã check-in thì không cần nhắc. */}
        <IconButton
          icon={Copy}
          label='Copy tin nhắn nhắc check-in (dán vào Zalo)'
          className='h-11 w-11'
          disabled={checkedIn}
          onClick={onRemind}
        />
        {SHOW_TRANSFER_COLUMN && (
          <Button
            className='h-11'
            variant='outline'
            disabled={transferDisabled}
            onClick={onTransfer}
          >
            Chuyển phiên
          </Button>
        )}
      </div>
    </li>
  );
}

export default function ManualCheckinPage() {
  const queryClient = useQueryClient();
  const showForceCode = canViewForceCode(useSession()?.roles);
  // Cùng nhóm MN/CL được xem mã force mới được chuyển ca theo yêu cầu BTC.
  const canTransferForOrganizer = showForceCode;
  // Nhân viên check-in (không giữ mã) phải nhập mã khẩn cấp khi check-in trễ hoặc chuyển ca.
  const needsEmergencyCode = !showForceCode;

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
    mutationFn: async (payload: CheckInBachelorInput) => {
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

      // Side đích mặc định là side cũ; đổi side thì nạp lại danh sách phiên của side đó.
      const field = (label: string, control: HTMLSelectElement | HTMLInputElement) => {
        const wrapper = document.createElement('label');
        wrapper.style.display = 'block';
        wrapper.style.textAlign = 'left';
        wrapper.style.marginBottom = '12px';
        const caption = document.createElement('div');
        caption.textContent = label;
        caption.style.fontWeight = '600';
        caption.style.marginBottom = '4px';
        control.style.width = '100%';
        control.style.padding = '6px';
        wrapper.append(caption, control);
        return wrapper;
      };

      const hallSelect = document.createElement('select');
      const halls = hallList?.length ? hallList : [{ hallId: -1, hallName }];
      halls.forEach((h) => {
        const opt = document.createElement('option');
        opt.value = String(h.hallId);
        opt.text = h.hallName;
        opt.dataset.name = h.hallName;
        opt.selected = h.hallName.toLowerCase() === hallName.toLowerCase();
        hallSelect.appendChild(opt);
      });

      const select = document.createElement('select');
      const fillSessions = (list: typeof sessions) => {
        const previous = select.value;
        select.replaceChildren();
        list.forEach((s) => {
          const opt = document.createElement('option');
          opt.value = String(s.sessionId);
          opt.text = `Phiên ${s.sessionInDay ?? ''} (Session: ${
            s.sessionNumber ?? ''
          }) ${s.sessionDescription ? '- ' + s.sessionDescription : ''}`;
          opt.selected = opt.value === previous;
          select.appendChild(opt);
        });
      };
      fillSessions(sessions);
      hallSelect.addEventListener('change', () => {
        const name = hallSelect.selectedOptions[0]?.dataset.name;
        if (!name) return;
        select.disabled = true;
        getSessionsByHallName(name)
          .then((list) => fillSessions(list ?? []))
          .catch(() =>
            toast.error('Không lấy được danh sách phiên của side này'),
          )
          .finally(() => {
            select.disabled = false;
          });
      });

      // Lý do chuyển ca: trễ (ghi nhận trễ) hoặc BTC dời (không tính trễ, chỉ MN/CL).
      const reasonSelect = document.createElement('select');
      [
        ['late', 'Đến trễ (ghi nhận trễ)'],
        ['organizer', 'BTC dời ca (không tính trễ)'],
      ].forEach(([value, text]) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.text = text;
        reasonSelect.appendChild(opt);
      });

      const content = document.createElement('div');
      if (canTransferForOrganizer)
        content.appendChild(field('Lý do', reasonSelect));
      content.appendChild(field('Side', hallSelect));
      content.appendChild(field('Phiên mới', select));
      const codeInput = createEmergencyCodeInput();
      if (needsEmergencyCode) content.appendChild(field('Mã khẩn cấp', codeInput));

      const confirm = await swal({
        title: 'Chuyển ca',
        text: `Chuyển ca cho ${row.fullName}. Ghế được xếp tự động ngay sau người cuối cùng của phiên mới trong side đã chọn.${
          needsEmergencyCode ? `\n\nChuyển ca cần mã khẩn cấp. ${EMERGENCY_CODE_HINT}` : ''
        }`,
        content: content as any,
        buttons: ['Hủy', 'Chuyển'],
      });

      if (!confirm) return;
      const emergencyCode = codeInput.value.trim();
      if (needsEmergencyCode && !emergencyCode) {
        toast.error('Chưa nhập mã khẩn cấp nên chưa chuyển ca.');
        return;
      }

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
          ...(Number(hallSelect.value) > 0
            ? { newHallId: Number(hallSelect.value) }
            : {}),
          reason: canTransferForOrganizer
            ? (reasonSelect.value as TransferReason)
            : 'late',
          ...(needsEmergencyCode ? { emergencyCode } : {}),
        }),
        {
          loading: 'Đang chuyển phiên...',
          success: 'Chuyển phiên thành công',
          error: (err: any) =>
            `Không thể chuyển phiên: ${err?.response?.data?.message ?? err?.message ?? ''}`,
        },
        { position: 'top-right', duration: 3000 },
      );

      // Extract payload safely (some APIs wrap in data.data)
      const payload = transferRes;

      if (payload) {
        setTransferResult(payload);
        setTransferDialogOpen(true);
      }

      queryClient.invalidateQueries({ queryKey: bachelorKeys.lists() });
    },
    [queryClient, canTransferForOrganizer, needsEmergencyCode, hallList],
  );

  const handleCheckin = useCallback(
    async (row: any) => {
      const studentCode: string = row.studentCode;

      const nextStatus = !row.checkIn;
      const confirmationInput = document.createElement('input');
      confirmationInput.className = 'swal-content__input';
      confirmationInput.placeholder = studentCode;
      confirmationInput.autocomplete = 'off';

      // Xem trước kết quả thật ngay trước khi hỏi: phiên có thể vừa bị khóa, LED có thể vừa chuyển người.
      const preview = nextStatus
        ? await getCheckInPreview(studentCode).catch(() => null)
        : null;
      const dialog = nextStatus ? describeCheckInPreview(preview, row.fullName) : null;
      // Check-in trễ (phiên đã khóa) cần mã khẩn cấp với nhân viên check-in.
      const lateNeedsCode =
        nextStatus &&
        needsEmergencyCode &&
        (preview?.outcome === 'late-keep-seat' || preview?.outcome === 'late-move-to-end');
      const codeInput = createEmergencyCodeInput();

      const confirm = await swal({
        title: nextStatus ? 'Checkin' : 'Hủy checkin',
        text: dialog
          ? `${dialog.text}${lateNeedsCode ? `\n\nCheck-in trễ cần mã khẩn cấp. ${EMERGENCY_CODE_HINT}` : ''}`
          : `Nhập đúng MSSV ${studentCode} để xác nhận hủy checkin cho ${row.fullName}.`,
        icon: dialog?.icon ?? 'warning',
        content: nextStatus
          ? lateNeedsCode
            ? (codeInput as any)
            : undefined
          : (confirmationInput as any),
        buttons: nextStatus ? ['Không', 'Checkin'] : ['Không', 'Hủy checkin'],
        dangerMode: !nextStatus || dialog?.danger === true,
      });

      if (!confirm) return;
      const emergencyCode = codeInput.value.trim();
      if (lateNeedsCode && !emergencyCode) {
        toast.error('Chưa nhập mã khẩn cấp nên chưa check-in.', {
          position: 'top-right',
          duration: 4000,
        });
        return;
      }

      if (
        !nextStatus &&
        confirmationInput.value.trim().toLowerCase() !==
          studentCode.toLowerCase()
      ) {
        toast.error(
          'MSSV xác nhận không khớp. Đã giữ nguyên trạng thái checkin.',
          {
            position: 'top-right',
            duration: 4000,
          },
        );
        return;
      }

      // Disable switch của MSSV này
      setProcessingIds((prev) => new Set(prev).add(studentCode));

      try {
        const nData: CheckInBachelorInput = {
          studentCode,
          status: nextStatus,
          ...(lateNeedsCode ? { emergencyCode } : {}),
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
            },
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
    [checkinAction, needsEmergencyCode],
  );

  // Force check-in: bỏ qua phiên mở/khóa, server kiểm tra mã khẩn cấp và khoảng cách với LED.
  const handleForceCheckin = useCallback(
    async (row: any) => {
      const studentCode: string = row.studentCode;
      if (row.checkIn) {
        toast.error(`${row.fullName} đã check-in rồi.`, {
          position: 'top-right',
          duration: 3000,
        });
        return;
      }
      const codeInput = createEmergencyCodeInput();

      const confirm = await swal({
        title: 'Force check-in',
        text: `Check-in khẩn cấp cho ${row.fullName} (${studentCode}) bất kể phiên đang mở hay khóa.\n\n${EMERGENCY_CODE_HINT}`,
        icon: 'warning',
        content: codeInput as any,
        buttons: ['Không', 'Force check-in'],
        dangerMode: true,
      });
      const emergencyCode = codeInput.value.trim();
      if (!confirm || !emergencyCode) return;

      setProcessingIds((prev) => new Set(prev).add(studentCode));
      try {
        const result = await forceCheckInBachelor({
          studentCode,
          emergencyCode,
        });
        toast.success(
          `Force check-in cho ${row.fullName} thành công. Ghế: ${result?.chair ?? '-'}`,
          {
            position: 'top-right',
            duration: 4000,
          },
        );
        queryClient.invalidateQueries({ queryKey: bachelorKeys.lists() });
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? err?.message ?? '';
        toast.error(`Không thể force check-in: ${msg}`, {
          position: 'top-right',
          duration: 5000,
        });
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(studentCode);
          return next;
        });
      }
    },
    [queryClient],
  );

  // Nhấn 1 lần: check-in thường (chờ một nhịp để phân biệt). Nhấn nhanh 4 lần: force check-in.
  const switchHandlers = useRef({
    single: handleCheckin,
    burst: handleForceCheckin,
  });
  switchHandlers.current = { single: handleCheckin, burst: handleForceCheckin };
  const handleSwitchClick = useMemo(
    () =>
      createClickBurst<any>({
        count: 4,
        windowMs: 450,
        onSingle: (row) => void switchHandlers.current.single(row),
        onBurst: (row) => void switchHandlers.current.burst(row),
      }),
    [],
  );

  // ---- Đăng ký session bù
  const updateBachelorMissingSession = useMutation({
    mutationFn: () => {
      return moveBachelorToTemporarySession(mssv, sessionBachelor === '1');
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
      { position: 'top-right', duration: 6000 },
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

  /** Chép tin nhắc check-in (có định dạng màu cho Zalo) của một tân cử nhân, điền sẵn họ tên, MSSV và phòng. */
  const copyReminder = useCallback((bachelor: { fullName: string; studentCode: string; checkinRoom?: string | null }) => {
    const reminder = buildCheckInReminder({
      fullName: bachelor.fullName,
      studentCode: bachelor.studentCode,
      room: bachelor.checkinRoom,
    });
    if (copyRichText(reminder)) {
      toast.success(`Đã copy tin nhắc check-in của ${bachelor.fullName}`, { duration: 2500, position: 'top-right' });
    } else {
      toast.error('Không copy được, vui lòng thử lại hoặc chép thủ công.', { duration: 4000, position: 'top-right' });
    }
  }, []);

  const isCheckinDisabled = useCallback(
    (row: Bachelor) =>
      processingIds.has(row.studentCode) ||
      updateBachelorMissingSession.isPending ||
      !canCheckInRoom(assignedRooms, row.checkinRoom),
    [processingIds, updateBachelorMissingSession.isPending, assignedRooms],
  );
  const isTransferDisabled = useCallback(
    (row: Bachelor) =>
      row.checkIn === true ||
      processingIds.has(row.studentCode) ||
      !canCheckInRoom(assignedRooms, row.checkinRoom),
    [processingIds, assignedRooms],
  );
  const transfer = useCallback(
    (row: Bachelor) => {
      // toast.promise đã hiện lỗi cho người dùng
      promptTransferToAnotherSession(row).catch(() => undefined);
    },
    [promptTransferToAnotherSession],
  );

  // Cột thao tác đặt ngay sau tên/MSSV để không phải cuộn ngang mới thấy.
  const columns: ColumnDef<any>[] = useMemo(
    () => [
      { accessorKey: 'fullName', header: 'Tên' },
      { accessorKey: 'studentCode', header: 'MSSV' },
      {
        accessorKey: 'checkIn',
        header: 'Checkin',
        cell: ({ row }) => (
          <Switch
            checked={row.getValue<boolean>('checkIn')}
            disabled={isCheckinDisabled(row.original)}
            onCheckedChange={() =>
              handleSwitchClick(row.original.studentCode, row.original)
            }
          />
        ),
      },
      {
        id: 'reminder',
        header: 'Nhắc check-in',
        meta: 'actions',
        cell: ({ row }) => (
          <IconButton
            icon={Copy}
            label='Copy tin nhắn nhắc check-in (dán vào Zalo)'
            onClick={() => copyReminder(row.original)}
            // Người đã check-in thì không cần nhắc.
            disabled={row.original.checkIn === true}
          />
        ),
      },
      ...(SHOW_TRANSFER_COLUMN
        ? [
            {
              id: 'transfer',
              header: 'Chuyển phiên',
              meta: 'actions',
              cell: ({ row }) => (
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => transfer(row.original)}
                  disabled={isTransferDisabled(row.original)}
                >
                  Chuyển phiên
                </Button>
              ),
            } satisfies ColumnDef<any>,
          ]
        : []),
      { accessorKey: 'hallName', header: 'Side' },
      {
        accessorKey: 'sessionNum',
        header: 'Phiên tổng',
        cell: ({ row }) => (
          <p>{sessionLabel(row.getValue<number>('sessionNum'))}</p>
        ),
      },
      { accessorKey: 'sessionInDay', header: 'Phiên theo ngày' },
      { accessorKey: 'chair', header: 'Ghế' },
      { accessorKey: 'chairParent', header: 'Ghế phụ huynh' },
      { accessorKey: 'checkinRoom', header: 'Phòng checkin' },
      { accessorKey: 'mail', header: 'Mail' },
      { accessorKey: 'id', header: 'ID' },
    ],
    [handleSwitchClick, isCheckinDisabled, isTransferDisabled, transfer, copyReminder],
  );

  const showPagination =
    !isLoading &&
    !!bachelorDT?.totalItems &&
    !!bachelorDT?.totalPages &&
    bachelorDT.hasNextPage !== undefined &&
    bachelorDT.hasPreviousPage !== undefined;

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

      <div className='mt-3 flex flex-col gap-3'>
        {/* Mobile: tìm kiếm và danh sách lên trước, bảng trạng thái side xuống cuối. */}
        <Card className='order-last lg:order-first animate-fade-up'>
          <CardContent className='p-3'>
            <MultiHallStatusDisplay />
          </CardContent>
        </Card>

        <Card className='animate-fade-up'>
          <CardContent className='p-3 space-y-3'>
            {showForceCode && <ForceCodeBadge />}
            {hasNoAssignedRoom && (
              <p className='rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive'>
                Tài khoản của bạn chưa được phân phòng checkin nên chưa thể
                checkin. Vui lòng liên hệ quản lý.
              </p>
            )}
            <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]'>
              <Input
                size={'md'}
                className='sm:col-span-2 lg:col-span-1'
                placeholder='Tìm theo tên hoặc MSSV'
                defaultValue={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPageIndex(1);
                }}
              />
              <Select onValueChange={setHall}>
                <SelectTrigger color='primary' className='w-full'>
                  <SelectValue color='primary' placeholder='Chọn side' />
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
                <SelectTrigger className='w-full'>
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
                <SelectTrigger className='w-full'>
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

            <div className='flex items-baseline justify-between'>
              <h2 className='text-base font-bold lg:text-xl'>
                Danh sách tân cử nhân
              </h2>
              {bachelorDT?.totalItems ? (
                <span className='text-sm text-muted-foreground'>
                  {bachelorDT.totalItems} người
                </span>
              ) : null}
            </div>

            {/* Màn hình nhỏ: mỗi người một thẻ, nút checkin luôn nằm trong tầm nhìn. */}
            <div className='lg:hidden'>
              {isLoading ? (
                <p className='py-8 text-center text-sm text-muted-foreground'>
                  Đang tải...
                </p>
              ) : bachelorList.length === 0 ? (
                <p className='py-8 text-center text-sm text-muted-foreground'>
                  Không có dữ liệu
                </p>
              ) : (
                <ul className='space-y-2'>
                  {bachelorList.map((b) => (
                    <BachelorCheckinCard
                      key={b.studentCode}
                      bachelor={b}
                      checkinDisabled={isCheckinDisabled(b)}
                      transferDisabled={isTransferDisabled(b)}
                      onCheckin={() => handleSwitchClick(b.studentCode, b)}
                      onTransfer={() => transfer(b)}
                      onRemind={() => copyReminder(b)}
                    />
                  ))}
                </ul>
              )}
              {showPagination && (
                <TablePagination
                  hasNextPage={bachelorDT!.hasNextPage!}
                  hasPreviousPage={bachelorDT!.hasPreviousPage!}
                  pageIndex={pageIndex}
                  pageSize={pageSize}
                  setPageIndex={setPageIndex}
                  setPageSize={setPageSize}
                  totalItems={bachelorDT!.totalItems!}
                  totalPages={bachelorDT!.totalPages!}
                />
              )}
            </div>

            <div className='hidden lg:block [&>div>div:first-child]:hidden'>
              <TableCustom
                title=''
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
              />
            </div>
          </CardContent>
        </Card>
      </div>

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
                <span className='font-medium'>Lý do:</span>
                <span>
                  {transferResult.reason === 'organizer'
                    ? 'BTC dời ca (không tính trễ)'
                    : 'Đến trễ (ghi nhận trễ)'}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='font-medium'>Side:</span>
                <span>{transferResult.newHall ?? '-'}</span>
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
