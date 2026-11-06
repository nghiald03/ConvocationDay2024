'use client';

import TableCustom from '@/components/table/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bachelor } from '@/features/bachelor/model/bachelor';
import { cn } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import toast from '@/lib/toast';

import { getLatestBachelorImport, startBachelorImport } from '@/features/bachelor/api/bachelor-import';
import { isImportFinished } from '@/features/bachelor/model/bachelor-import';
import {
  bachelorImportKeys,
  bachelorImportQueryOptions,
  bachelorKeys,
  latestBachelorImportQueryOptions,
} from '@/features/bachelor/queries/bachelor-query-options';
import { ImportProgress } from '@/features/bachelor/ui/import-progress';
import { getHttpErrorMessage } from '@/lib/http/get-http-error-message';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { Loader2 } from 'lucide-react';

/** Header chuẩn theo file của anh */
const EXPECTED_HEADERS = [
  'STT',
  'Image',
  'Ho_va_ten',
  'MSSV',
  'Mail',
  'Nganh_hoc',
  'Hall',
  'Session',
  'SessionInDay',
  'Vi_tri_ghe',
  'Vi_tri_ghe_phu_huynh',
  'Checkin_room',
] as const;

/**
 * Chuẩn hoá tên header:
 * - Trim
 * - Bỏ dấu tiếng Việt
 * - Lowercase
 * - Khoảng trắng thành _
 * - Loại ký tự không phải [a-z0-9_]
 * - Gộp nhiều _ thành một
 */
const normalizeHeader = (s: unknown) =>
  String(s ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // bỏ dấu
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_');

type AddBachelorFromFileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Không đặt dialog này trong DropdownMenuContent: cửa sổ chọn file làm window mất focus,
// menu tự đóng và unmount luôn dialog trước khi onChange của input kịp chạy.
export default function AddBachelorFromFile({
  open,
  onOpenChange,
}: AddBachelorFromFileDialogProps) {
  const [excelData, setExcelData] = useState<Bachelor[] | null>(null);
  // Mã lần import đang theo dõi; còn giữ khi đóng hộp thoại để mở lại vẫn thấy tiến độ.
  const [jobId, setJobId] = useState<string | null>(null);
  const notifiedJobRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const columnsFileUpload: ColumnDef<Bachelor>[] = [
    {
      accessorKey: 'image',
      header: 'Image',
      cell: ({ row }) => (
        <div className='text-base max-w-10 truncate'>
          {row.getValue('image')}
        </div>
      ),
    },
    { accessorKey: 'major', header: 'Ngành' },
    { accessorKey: 'fullName', header: 'Họ và tên' },
    { accessorKey: 'studentCode', header: 'MSSV' },
    { accessorKey: 'mail', header: 'Mail' },
    { accessorKey: 'hallName', header: 'Side' },
    { accessorKey: 'sessionNum', header: 'Session' },
    { accessorKey: 'sessionInDay', header: 'SessionInDay' },
    { accessorKey: 'chair', header: 'Ghế' },
    { accessorKey: 'chairParent', header: 'Ghế phụ huynh' },
    { accessorKey: 'checkinRoom', header: 'Phòng checkin' },
  ];

  const resetInput = () => {
    setExcelData([]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(content, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Đọc mảng để tự xử lý header + thứ tự cột
        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, {
          header: 1,
          defval: '',
          blankrows: false, // loại dòng trắng (kể cả dòng cuối)
          raw: false,
        });

        if (!rows.length) {
          toast.error('File rỗng hoặc không có dữ liệu', {
            duration: 6000,
            position: 'top-right',
          });
          resetInput();
          return;
        }

        const headerRow: string[] = (rows[0] ?? []).map((h) => String(h ?? ''));
        const headerNorm = headerRow.map(normalizeHeader);
        const expectedNorm = EXPECTED_HEADERS.map(normalizeHeader);

        // Map: normalized header -> index trong file
        const headerIndexMap = new Map<string, number>();
        headerNorm.forEach((hn, idx) => {
          if (!headerIndexMap.has(hn)) headerIndexMap.set(hn, idx);
        });

        // Kiểm tra thiếu cột nào (theo tên)
        const missingHeaders = expectedNorm.filter(
          (hn) => !headerIndexMap.has(hn)
        );
        if (missingHeaders.length > 0) {
          toast.error(
            `Thiếu cột: ${missingHeaders.join(
              ', '
            )}\n(Lưu ý: tên cột được chuẩn hoá không dấu, lowercase, "_" cho khoảng trắng)`,
            { duration: 10000, position: 'top-right' }
          );
          console.table(headerRow);
          resetInput();
          return;
        }

        // Data rows: bỏ header + bỏ dòng toàn rỗng
        const dataRows = rows
          .slice(1)
          .filter(
            (row) =>
              Array.isArray(row) &&
              row.some((cell) => String(cell ?? '').trim() !== '')
          );

        const missingData: { row: number; column: string }[] = [];

        const getByHeader = (
          row: any[],
          label: (typeof EXPECTED_HEADERS)[number]
        ) => {
          const idx = headerIndexMap.get(normalizeHeader(label))!;
          return row[idx];
        };

        const data: Bachelor[] = dataRows.map((row, rowIndex) => {
          // Validate rỗng cho từng header (trừ STT cho phép trống)
          EXPECTED_HEADERS.forEach((label) => {
            if (label === 'STT') return; // STT có thể trống
            const v = getByHeader(row, label);
            if (String(v ?? '').trim() === '') {
              // +2: +1 bỏ header, +1 vì Excel hiển thị dòng bắt đầu 1
              missingData.push({ row: rowIndex + 2, column: label });
            }
          });

          // Map field theo TÊN CỘT thực tế
          const rawSessionInDay = getByHeader(row, 'SessionInDay');
          const parsedSessionInDay =
            rawSessionInDay === undefined ||
            rawSessionInDay === null ||
            String(rawSessionInDay).trim() === ''
              ? null
              : Number.isNaN(Number(rawSessionInDay))
              ? null
              : Number(rawSessionInDay);

          const bachelor: Bachelor = {
            image: getByHeader(row, 'Image'),
            fullName: getByHeader(row, 'Ho_va_ten'),
            studentCode: getByHeader(row, 'MSSV'),
            mail: getByHeader(row, 'Mail'),
            major: getByHeader(row, 'Nganh_hoc'),
            hallName: getByHeader(row, 'Hall'),
            sessionNum: getByHeader(row, 'Session'),
            sessionInDay: parsedSessionInDay,
            chair: getByHeader(row, 'Vi_tri_ghe'),
            chairParent: getByHeader(row, 'Vi_tri_ghe_phu_huynh'),
            checkinRoom: String(getByHeader(row, 'Checkin_room')).trim(),
          };

          return bachelor;
        });

        if (missingData.length > 0) {
          missingData.forEach((cell) => {
            toast.error(
              `Thiếu dữ liệu ở cột ${cell.column}, hàng ${cell.row}`,
              {
                duration: 10000,
                position: 'top-right',
              }
            );
          });
          resetInput();
          return;
        }

        setExcelData(data);
        console.log('Parsed Data:', data);
      } catch (err) {
        console.error(err);
        toast.error('Không đọc được file. Vui lòng kiểm tra định dạng.', {
          duration: 8000,
          position: 'top-right',
        });
        resetInput();
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Mở lại hộp thoại (hoặc tải lại trang) khi có lần import đang chạy thì theo dõi tiếp.
  const { data: latestJob } = useQuery(latestBachelorImportQueryOptions(open && jobId === null));
  useEffect(() => {
    if (latestJob?.status === 'running' && notifiedJobRef.current !== latestJob.id) setJobId(latestJob.id);
  }, [latestJob]);

  const { data: job } = useQuery(bachelorImportQueryOptions(jobId));

  // Báo một lần khi lần import kết thúc, kể cả khi hộp thoại đang đóng.
  useEffect(() => {
    if (!job || !isImportFinished(job) || notifiedJobRef.current === job.id) return;
    notifiedJobRef.current = job.id;
    queryClient.invalidateQueries({ queryKey: bachelorKeys.lists() });
    if (job.status === 'failed') {
      toast.error(job.message ?? 'Import thất bại', { duration: 8000, position: 'top-right' });
    } else if (job.failed > 0) {
      toast.error(`Import xong: ${job.added} thành công, ${job.failed} dòng lỗi`, {
        duration: 8000,
        position: 'top-right',
      });
    } else {
      toast.success(`Import xong ${job.added} tân cử nhân`, { duration: 5000, position: 'top-right' });
    }
  }, [job, queryClient]);

  type AddBachelorFromFileProps = {
    data: Bachelor[];
  };

  const addBachelorFromFile = useMutation({
    mutationFn: ({ data }: AddBachelorFromFileProps) => {
      const dataUpload = data.map((item) => ({
        studentCode: item.studentCode,
        fullName: item.fullName,
        mail: item.mail,
        major: item.major?.toString(),
        image: item.image,
        hallName: item.hallName,
        sessionNum: item.sessionNum,
        sessionInDay: item.sessionInDay ?? null,
        chair: item.chair?.toString(),
        chairParent: item.chairParent?.toString(),
        checkinRoom: item.checkinRoom,
      }));
      return startBachelorImport(dataUpload);
    },
    onSuccess: (started) => {
      setJobId(started.id);
      setExcelData([]);
      if (inputRef.current) inputRef.current.value = '';
    },
    onError: async (error: unknown) => {
      // 409: đang có lần import khác chạy; theo dõi lần đó thay vì báo lỗi.
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const running = await getLatestBachelorImport().catch(() => null);
        if (running?.status === 'running') {
          setJobId(running.id);
          toast.error('Đang có một lần import khác chạy, đang hiển thị tiến độ của lần đó.', {
            duration: 6000,
            position: 'top-right',
          });
          return;
        }
      }
      const msg = getHttpErrorMessage(error, 'Không rõ lỗi');
      toast.error('Không bắt đầu được import: ' + msg, {
        duration: 5000,
        position: 'top-right',
      });
      setExcelData([]);
      if (inputRef.current) inputRef.current.value = '';
    },
  });

  const importFinished = isImportFinished(job);
  const closeAndReset = () => {
    if (importFinished) {
      setJobId(null);
      // Bỏ dữ liệu "đang chạy" cũ để lần mở sau không bắt nhầm lại lần import đã xong.
      queryClient.removeQueries({ queryKey: bachelorImportKeys.latest() });
    }
    setExcelData(null);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true);
          return;
        }
        // Đang import thì chỉ đóng hộp thoại, giữ lại mã để mở lại vẫn thấy tiến độ.
        closeAndReset();
      }}
    >
      <DialogContent size='lg'>
        <DialogHeader>
          <DialogTitle>{jobId ? 'Tiến độ import tân cử nhân' : 'Thêm tân cử nhân từ file'}</DialogTitle>
        </DialogHeader>

        {jobId ? (
          job ? (
            <ImportProgress job={job} />
          ) : (
            <p className='flex items-center gap-2 text-sm text-muted-foreground'>
              <Loader2 className='h-4 w-4 animate-spin' aria-hidden='true' />
              Đang lấy tiến độ…
            </p>
          )
        ) : (
          <div className='grid grid-cols-4 h-full'>
            <div
              className={cn(
                'flex-col w-full items-center gap-1.5',
                excelData && excelData.length > 0 ? 'col-span-1' : 'col-span-4'
              )}
            >
              <Label htmlFor='file'>Tải lên danh sách TCN</Label>
              <Input
                ref={inputRef}
                id='file'
                type='file'
                accept='.xlsx,.xls'
                onChange={handleFileChange}
              />
            </div>

            {excelData && excelData.length > 0 && (
              <div className='col-span-3 flex max-h-[85vh] overflow-scroll'>
                <Separator className='mx-3' orientation='vertical' />
                <TableCustom
                  columns={columnsFileUpload}
                  title='Preview file tải lên'
                  overflow
                  data={excelData}
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {jobId ? (
            <Button color='primary' onClick={closeAndReset}>
              {importFinished ? 'Xong' : 'Đóng (import vẫn chạy)'}
            </Button>
          ) : (
            <>
              <DialogClose asChild>
                <Button
                  variant='outline'
                  color='warning'
                  onClick={() => {
                    if (inputRef.current) inputRef.current.value = '';
                    setExcelData([]);
                  }}
                >
                  Hủy
                </Button>
              </DialogClose>

              <Button
                disabled={!excelData || excelData.length === 0 || addBachelorFromFile.isPending}
                onClick={() => {
                  if (excelData && Array.isArray(excelData) && excelData.length > 0) {
                    addBachelorFromFile.mutate({ data: excelData });
                  }
                }}
                color='primary'
              >
                {addBachelorFromFile.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                {addBachelorFromFile.isPending ? 'Đang gửi...' : 'Tải lên'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
