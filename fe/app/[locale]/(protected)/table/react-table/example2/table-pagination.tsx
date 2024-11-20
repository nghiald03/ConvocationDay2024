import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table } from '@tanstack/react-table';
import { outline } from '@yudiel/react-qr-scanner';
import { set } from 'lodash';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';
import ReactPaginate from 'react-paginate';

interface DataTablePaginationProps {
  pageSize: number;
  pageIndex: number;
  totalItems: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  setPageSize: (pageSize: number) => void;
  setPageIndex: (pageIndex: number) => void;
}

const TablePagination = ({
  currentPage,
  hasNextPage,
  hasPreviousPage,
  pageIndex,
  pageSize,
  setPageIndex,
  setPageSize,
  totalItems,
  totalPages,
}: DataTablePaginationProps) => {
  const MAX_PAGES_DISPLAY = 5; // Số button tối đa sẽ hiển thị
  const PAGE_SIZES = [20, 25, 30, 50, 100];
  return (
    <div className='flex items-center justify-end py-4 px-10'>
      <div className='flex text-sm text-muted-foreground'>
        Hiện thị {pageIndex} / {totalPages} trang
      </div>
      <div className='flex-1 ml-4'>
        <Select
          defaultValue='20'
          onValueChange={(value) => {
            setPageSize(Number(value));
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
        <ReactPaginate
          breakLabel={
            <Button variant={'outline'} color='primary'>
              ...
            </Button>
          }
          nextLabel={
            <Button variant={'outline'} color='primary' disabled={!hasNextPage}>
              <ChevronRight className='w-4 h-4' />
            </Button>
          }
          onPageChange={(page) => {
            setPageIndex(page.selected + 1);
          }}
          pageRangeDisplayed={5}
          pageCount={totalPages}
          previousLabel={
            <Button
              variant={'outline'}
              color='primary'
              disabled={!hasPreviousPage}
            >
              <ChevronLeft className='w-4 h-4' />
            </Button>
          }
          className='flex gap-1 justify-center align-middle'
          pageLabelBuilder={(page) => (
            <Button
              variant={page === pageIndex ? 'default' : 'outline'}
              color='primary'
            >
              {page}
            </Button>
          )}
          renderOnZeroPageCount={null}
        />
        {/* <Button
          variant='outline'
          color='primary'
          size='icon'
          onClick={() => setPageIndex(pageIndex - 1)}
          disabled={!hasPreviousPage}
          className='w-8 h-8'
        >
          <ChevronLeft className='w-4 h-4' />
        </Button>

        {pageIndex == totalPages - 1 && totalPages > MAX_PAGES_DISPLAY && (
          <span>...</span>
        )}

        {pageIndex < totalPages - 1 && totalPages > MAX_PAGES_DISPLAY && (
          <span>...</span>
        )}
        {/* Hiển thị dấu ... nếu còn nhiều trang */}
        {/* <Button
          variant='outline'
          size='icon'
          color='primary'
          onClick={() => setPageIndex(pageIndex + 1)}
          disabled={!hasNextPage}
          className='w-8 h-8'
        >
          <ChevronRight className='w-4 h-4' />
        </Button>  */}
      </div>
    </div>
  );
};

export default TablePagination;
