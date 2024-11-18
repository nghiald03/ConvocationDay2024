import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';

interface DataTablePaginationProps {
  table: Table<any>;
}

const TablePagination = ({ table }: DataTablePaginationProps) => {
  const MAX_PAGES_DISPLAY = 5; // Số button tối đa sẽ hiển thị
  const [pageSize, setPageSize] = useState(10);
  const PAGE_SIZES = [10, 20, 30, 50, 100];
  const pageIndex = table.getState().pagination.pageIndex;
  const totalPages = table.getPageOptions().length;

  const getPageRange = () => {
    if (totalPages <= MAX_PAGES_DISPLAY) {
      return table.getPageOptions(); // Hiển thị tất cả nếu số trang ít hơn giới hạn
    }

    const start = Math.max(0, pageIndex - Math.floor(MAX_PAGES_DISPLAY / 2));
    const end = Math.min(
      totalPages - 1,
      pageIndex + Math.floor(MAX_PAGES_DISPLAY / 2)
    );

    // Nếu đang ở đầu hoặc cuối, điều chỉnh để luôn hiển thị đủ số button
    const rangeStart =
      start === 0 ? start : Math.max(0, end - MAX_PAGES_DISPLAY + 1);
    const rangeEnd =
      end === totalPages - 1
        ? end
        : Math.min(totalPages - 1, rangeStart + MAX_PAGES_DISPLAY - 1);

    return table.getPageOptions().slice(rangeStart, rangeEnd + 1);
  };
  return (
    <div className='flex items-center justify-end py-4 px-10'>
      {/* <div className="flex-1 text-sm text-muted-foreground">
        {table.getFilteredSelectedRowModel().rows.length} of{" "}
        {table.getFilteredRowModel().rows.length} row(s) selected.
      </div> */}
      <div className='flex text-sm text-muted-foreground'>
        Hiện thị {pageIndex + 1} / {totalPages} trang
      </div>
      <div className='flex-1 ml-4'>
        <Select
          defaultValue='10'
          onValueChange={(value) => {
            setPageSize(Number(value));
            table.setPageSize(Number(value));
          }}
        >
          <SelectTrigger className='w-[200px]'>
            <SelectValue placeholder='Số dữ liệu trên mỗi trang' />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='flex items-center gap-2 flex-none'>
        <Button
          variant='outline'
          color='primary'
          size='icon'
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className='w-8 h-8'
        >
          <ChevronLeft className='w-4 h-4' />
        </Button>
        {/* {table.getPageOptions().map((page, pageIndex) => (
          <Button
            key={`basic-data-table-${pageIndex}`}
            onClick={() => table.setPageIndex(pageIndex)}
            size='icon'
            className='w-8 h-8'
            variant={
              table.getState().pagination.pageIndex === pageIndex
                ? 'default'
                : 'outline'
            }
          >
            {page + 1}
          </Button>
        ))} */}
        {pageIndex == totalPages - 1 && totalPages > MAX_PAGES_DISPLAY && (
          <span>...</span>
        )}
        {getPageRange().map((page, pageIndex) => (
          <Button
            key={`basic-data-table-${pageIndex}`}
            color='primary'
            onClick={() => table.setPageIndex(page)}
            size='icon'
            className='w-8 h-8'
            variant={
              table.getState().pagination.pageIndex === page
                ? 'default'
                : 'outline'
            }
          >
            {page + 1}
          </Button>
        ))}
        {pageIndex < totalPages - 1 && totalPages > MAX_PAGES_DISPLAY && (
          <span>...</span>
        )}
        {/* Hiển thị dấu ... nếu còn nhiều trang */}
        <Button
          variant='outline'
          size='icon'
          color='primary'
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className='w-8 h-8'
        >
          <ChevronRight className='w-4 h-4' />
        </Button>
      </div>
    </div>
  );
};

export default TablePagination;
