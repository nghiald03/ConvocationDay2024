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
import { expectedHeaders } from '@/lib/constant';
import { cn } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { manageAPI } from '@/config/axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { Loader2 } from 'lucide-react';
import { set } from 'lodash';

export default function AddBachelorFromFile() {
  const [excelData, setExcelData] = useState<any[] | null>(null);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null); // Ref for input element

  const columnsFileUpload: ColumnDef<Bachelor[]>[] = [
    {
      accessorKey: 'image',
      header: 'Image',

      cell: ({ row }) => (
        <div className='text-base'>{row.getValue('image')}</div>
      ),
    },
    { accessorKey: 'major', header: 'Ngành' },
    { accessorKey: 'fullName', header: 'Tên' },
    { accessorKey: 'studentCode', header: 'MSSV' },
    { accessorKey: 'mail', header: 'Mail' },
    { accessorKey: 'hallName', header: 'Hội trường' },
    { accessorKey: 'sessionNum', header: 'Session' },
    { accessorKey: 'chair', header: 'Ghế' },
    { accessorKey: 'chairParent', header: 'Ghế phụ huynh' },
  ];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(content, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
        }) as any[];

        const headerRow = jsonData[0];
        console.table(headerRow);

        const isHeaderValid = expectedHeaders.every(
          (header, index) => headerRow[index] === header
        );

        if (isHeaderValid) {
          const missingData: { row: number; column: string }[] = [];
          const data: Bachelor[] = jsonData.slice(1).map((row, rowIndex) => {
            const bachelor: Bachelor = {
              studentCode: row[3],
              fullName: row[2],
              mail: row[4],
              major: row[5],
              image: row[1],
              hallName: row[6],
              sessionNum: row[7],
              chair: row[8],
              chairParent: row[9],
            };

            expectedHeaders.forEach((header, colIndex) => {
              if (!row[colIndex]) {
                missingData.push({
                  row: rowIndex + 2,
                  column: header,
                });
              }
            });

            return bachelor;
          });

          if (missingData.length > 0) {
            missingData.forEach((cell) => {
              toast.error(
                `Thiếu dữ liệu ở cột ${cell.column}, hàng ${cell.row}`,
                { duration: 10000, position: 'top-right' }
              );
            });
            setExcelData([]);
            if (inputRef.current) inputRef.current.value = ''; // Reset input
          } else {
            setExcelData(data);
            console.log('Parsed Data:', data);
          }
        } else {
          toast.error('Header không đúng định dạng', {
            duration: 10000,
            position: 'top-right',
          });
          setExcelData([]);
          if (inputRef.current) inputRef.current.value = ''; // Reset input
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };
  type AddBachelorFromFileProps = {
    data: Bachelor[];
  };

  const addBachelorFromFile = useMutation({
    mutationFn: ({ data }: AddBachelorFromFileProps) => {
      const dataUpload = data.map((item) => {
        return {
          studentCode: item.studentCode,
          fullName: item.fullName,
          mail: item.mail,
          major: item.major,
          image: item.image,
          hallName: item.hallName,
          sessionNum: item.sessionNum,
          chair: item.chair.toString(),
          chairParent: item.chairParent.toString(),
        };
      });
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
      toast.error('Thêm thất bại' + error.respone.data, {
        duration: 3000,
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
        <div className='grid grid-cols-4'>
          <div
            className={cn(
              'flex-col w-full items-center gap-1.5',
              excelData && excelData.length > 0 ? 'col-span-1' : 'col-span-4'
            )}
          >
            <Label htmlFor='file'>Tải lên danh sách TCN</Label>
            <Input
              ref={inputRef} // Attach ref
              id='file'
              type='file'
              onChange={handleFileChange}
            />
          </div>
          {excelData && excelData.length > 0 && (
            <div className='col-span-3 flex max-h-96 overflow-scroll'>
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
              if (excelData && Array.isArray(excelData) && excelData.length > 0)
                addBachelorFromFile.mutate({ data: excelData });
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
