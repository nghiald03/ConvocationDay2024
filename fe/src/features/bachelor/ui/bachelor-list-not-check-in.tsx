'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useDebounce } from 'use-debounce';
import toast from 'react-hot-toast';
import { Icon } from '@iconify/react/dist/iconify.js';
import TableCustom from '@/components/table/table';
import { Button } from '@/components/ui/button';
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
import { getBachelors } from '@/features/bachelor/api/get-bachelors';
import type { Bachelor } from '@/features/bachelor/model/bachelor';
import type { BachelorListParams } from '@/features/bachelor/model/bachelor-page';
import { bachelorListQueryOptions } from '@/features/bachelor/queries/bachelor-query-options';
import { exportToExcel } from '@/features/bachelor/ui/export-bachelors-to-excel';
import { hallQueryOptions } from '@/features/hall/queries/hall-query-options';
import { sessionQueryOptions } from '@/features/session/queries/session-query-options';
import { createNotification } from '@/features/notification/api/create-notification';
import { getHttpErrorMessage } from '@/lib/http/get-http-error-message';

const ALL = '-1';
const EXPORT_PAGE_SIZE = 5000;

export default function BachelorListNotCheckin() {
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [searchText] = useDebounce(search, 500);
  const [hall, setHall] = useState(ALL);
  const [session, setSession] = useState(ALL);
  const [isExporting, setIsExporting] = useState(false);

  const filters = useMemo(
    () => ({
      search: searchText || undefined,
      hall: hall === ALL ? undefined : hall,
      session: session === ALL ? undefined : session,
      checkInStatus: 'unchecked' as const,
    }),
    [hall, searchText, session]
  );
  const params: BachelorListParams = { ...filters, pageIndex, pageSize };

  const { data, isLoading, isError } = useQuery({
    ...bachelorListQueryOptions(params),
    refetchInterval: 10000,
  });
  const { data: hallList } = useQuery(hallQueryOptions);
  const { data: sessionList } = useQuery(sessionQueryOptions);

  const notify = useMutation({
    mutationFn: (bachelor: Bachelor) =>
      createNotification({
        title: 'Thông báo hội trường',
        content: `Xin mời Tân cử nhân ${bachelor.fullName} với mã số sinh viên ${
          bachelor.studentCode
        } tới hội trường ${bachelor.hallName || ''} thuộc phiên ${
          bachelor.sessionNum
        } để làm thủ tục checkin trước khi cổng checkin đóng lại.`,
        priority: 2,
        isAutomatic: false,
        repeatCount: 1,
      }),
    onSuccess: (_, bachelor) =>
      toast.success(`Đã tạo thông báo gọi ${bachelor.fullName}`, {
        position: 'top-right',
      }),
    onError: (error) =>
      toast.error(getHttpErrorMessage(error, 'Gửi thông báo thất bại'), {
        position: 'top-right',
      }),
  });

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPageIndex(1);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const page = await getBachelors({
        ...filters,
        pageIndex: 1,
        pageSize: EXPORT_PAGE_SIZE,
      });
      if (!page.items.length) {
        toast('Không có tân cử nhân nào chưa checkin', { position: 'top-right' });
        return;
      }
      await exportToExcel(page.items, 'tcn_chua_checkin.xlsx');
    } catch (error) {
      toast.error(getHttpErrorMessage(error, 'Xuất file thất bại'), {
        position: 'top-right',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const columns: ColumnDef<Bachelor>[] = [
    { accessorKey: 'studentCode', header: 'MSSV' },
    { accessorKey: 'fullName', header: 'Họ tên' },
    { accessorKey: 'major', header: 'Ngành' },
    { accessorKey: 'hallName', header: 'Hội trường' },
    { accessorKey: 'sessionNum', header: 'Session' },
    { accessorKey: 'chair', header: 'Ghế' },
    { accessorKey: 'chairParent', header: 'Ghế phụ huynh' },
    {
      id: 'action',
      header: 'Thông báo',
      cell: ({ row }) => (
        <Button
          size='sm'
          variant='outline'
          disabled={notify.isPending && notify.variables?.studentCode === row.original.studentCode}
          onClick={() => notify.mutate(row.original)}
        >
          <Icon icon='heroicons-outline:speaker-wave' className='h-4 w-4 me-1' />
          Gọi TCN
        </Button>
      ),
    },
  ];

  return (
    <TableCustom
      title='Danh sách tân cử nhân chưa checkin'
      data={data?.items ?? []}
      columns={columns}
      isLoading={isLoading}
      isError={isError}
      pageIndex={pageIndex}
      pageSize={pageSize}
      setPageIndex={setPageIndex}
      setPageSize={resetPage(setPageSize)}
      totalItems={data?.totalItems}
      totalPages={data?.totalPages}
      hasNextPage={data?.hasNextPage}
      hasPreviousPage={data?.hasPreviousPage}
      header={
        <div className='flex flex-wrap gap-2 w-full'>
          <Input
            className='w-[300px] h-10'
            placeholder='Tìm kiếm theo tên hoặc mã sinh viên'
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPageIndex(1);
            }}
          />
          <Select value={hall} onValueChange={resetPage(setHall)}>
            <SelectTrigger className='w-[180px]'>
              <SelectValue placeholder='Chọn hội trường' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Hội trường</SelectLabel>
                <SelectItem value={ALL}>Toàn bộ hội trường</SelectItem>
                {hallList?.map((item) => (
                  <SelectItem key={item.hallId} value={String(item.hallId)}>
                    {item.hallName}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select value={session} onValueChange={resetPage(setSession)}>
            <SelectTrigger className='w-[180px]'>
              <SelectValue placeholder='Chọn session' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Session</SelectLabel>
                <SelectItem value={ALL}>Toàn bộ session</SelectItem>
                {sessionList?.map((item) => (
                  <SelectItem key={item.sessionId} value={String(item.sessionId)}>
                    {item.session1}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <div className='flex items-center text-sm text-muted-foreground px-2'>
            Còn <span className='font-semibold text-destructive mx-1'>{data?.totalItems ?? 0}</span>
            TCN chưa checkin
          </div>
          <Button
            variant='outline'
            className='h-10 ms-auto'
            onClick={handleExport}
            disabled={isExporting}
          >
            <Icon icon='vscode-icons:file-type-excel' className='h-4 w-4 me-2' />
            {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
          </Button>
        </div>
      }
    />
  );
}
