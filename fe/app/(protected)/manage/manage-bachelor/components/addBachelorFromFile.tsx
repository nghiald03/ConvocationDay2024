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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bachelor } from '@/dtos/BachelorDTO';
import { cn } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { manageAPI } from '@/config/axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  'Vi_tri_ghe',
  'Vi_tri_ghe_phu_huynh',
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
const normalizeHeader = (s: any) =>
  String(s ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // bỏ dấu
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_');

export default function AddBachelorFromFile() {
  const [excelData, setExcelData] = useState<Bachelor[] | null>(null);
  const [open, setOpen] = useState(false);
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
    { accessorKey: 'hallName', header: 'Hội trường' },
    { accessorKey: 'sessionNum', header: 'Session' },
    { accessorKey: 'chair', header: 'Ghế' },
    { accessorKey: 'chairParent', header: 'Ghế phụ huynh' },
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
          const bachelor: Bachelor = {
            image: getByHeader(row, 'Image'),
            fullName: getByHeader(row, 'Ho_va_ten'),
            studentCode: getByHeader(row, 'MSSV'),
            mail: getByHeader(row, 'Mail'),
            major: getByHeader(row, 'Nganh_hoc'),
            hallName: getByHeader(row, 'Hall'),
            sessionNum: getByHeader(row, 'Session'),
            chair: getByHeader(row, 'Vi_tri_ghe'),
            chairParent: getByHeader(row, 'Vi_tri_ghe_phu_huynh'),
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
        chair: item.chair?.toString(),
        chairParent: item.chairParent?.toString(),
      }));
      return manageAPI.addBachelor(dataUpload);
    },
    onSuccess: () => {
      toast.success('Thêm thành công', {
        duration: 5000,
        position: 'top-right',
      });
      setOpen(false);
      setExcelData([]);
      if (inputRef.current) inputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['bachelorList'] });
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data ||
        error?.message ||
        'Không rõ lỗi';
      toast.error('Thêm thất bại: ' + msg, {
        duration: 5000,
        position: 'top-right',
      });
      console.log('Error:', error);
      setExcelData([]);
      if (inputRef.current) inputRef.current.value = '';
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size='md'
          variant='outline'
          className='w-full flex justify-start'
        >
          Thêm tân cử nhân từ file
        </Button>
      </DialogTrigger>

      <DialogContent size='lg'>
        <DialogHeader>
          <DialogTitle>Thêm tân cử nhân từ file</DialogTitle>
        </DialogHeader>

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

        <DialogFooter>
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
            disabled={!excelData || addBachelorFromFile.isPending}
            onClick={() => {
              if (
                excelData &&
                Array.isArray(excelData) &&
                excelData.length > 0
              ) {
                addBachelorFromFile.mutate({ data: excelData });
              }
            }}
            color='primary'
          >
            {addBachelorFromFile.isPending && (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            )}
            {addBachelorFromFile.isPending ? 'Đang thêm...' : 'Tải lên'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
