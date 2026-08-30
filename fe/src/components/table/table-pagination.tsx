import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { useMemo } from 'react';

interface DataTablePaginationProps {
  pageSize: number;
  pageIndex: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  setPageSize: (pageSize: number) => void;
  setPageIndex: (pageIndex: number) => void;
}

const TablePagination = ({
  hasNextPage,
  hasPreviousPage,
  pageIndex,
  setPageIndex,
  setPageSize,
  pageSize,
  totalPages,
}: DataTablePaginationProps) => {
  const PAGE_SIZES = [10, 20, 25, 30, 50, 100];

  // Generate the pagination buttons
  const paginationButtons = useMemo(() => {
    // Helper function to create a page button
    const createPageButton = (page: number, isCurrent: boolean = false) => (
      <Button
        key={`page-${page}`}
        size='sm'
        variant={isCurrent ? 'default' : 'outline'}
        className='hidden sm:inline-flex p-1 sm:p-2 min-w-[40px]'
        onClick={() => setPageIndex(page)}
        disabled={isCurrent}
      >
        {page}
      </Button>
    );

    // Helper function to create an ellipsis
    const createEllipsis = (key: string) => (
      <Button
        key={key}
        size='sm'
        variant='ghost'
        className='hidden sm:inline-flex cursor-default'
        disabled
      >
        <MoreHorizontal className='h-4 w-4' />
      </Button>
    );

    const buttons = [];

    // Logic for generating pagination buttons with ellipsis
    if (totalPages <= 7) {
      // If we have 7 or fewer pages, show all of them
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(createPageButton(i, i === pageIndex));
      }
    } else {
      // Always show first page
      buttons.push(createPageButton(1, 1 === pageIndex));

      // Determine start and end of the middle section
      let startPage: number;
      let endPage: number;

      if (pageIndex <= 3) {
        // If current page is near the start
        startPage = 2;
        endPage = 5;
        buttons.push(
          ...Array.from({ length: endPage - startPage + 1 }, (_, i) =>
            createPageButton(startPage + i, startPage + i === pageIndex)
          ),
          createEllipsis('ellipsis-end'),
          createPageButton(totalPages, totalPages === pageIndex)
        );
      } else if (pageIndex >= totalPages - 2) {
        // If current page is near the end
        startPage = totalPages - 4;
        endPage = totalPages - 1;
        buttons.push(
          createEllipsis('ellipsis-start'),
          ...Array.from({ length: endPage - startPage + 1 }, (_, i) =>
            createPageButton(startPage + i, startPage + i === pageIndex)
          ),
          createPageButton(totalPages, totalPages === pageIndex)
        );
      } else {
        // Current page is in the middle
        startPage = pageIndex - 1;
        endPage = pageIndex + 1;
        buttons.push(
          createEllipsis('ellipsis-start'),
          ...Array.from({ length: endPage - startPage + 1 }, (_, i) =>
            createPageButton(startPage + i, startPage + i === pageIndex)
          ),
          createEllipsis('ellipsis-end'),
          createPageButton(totalPages, totalPages === pageIndex)
        );
      }
    }

    return buttons;
  }, [pageIndex, totalPages, setPageIndex]);

  return (
    <div className='flex flex-col sm:flex-row items-center justify-between py-4 sm:space-y-0'>
      {/* Page Info */}
      <div className='flex items-center justify-center align-middle space-x-2'>
        <div className='flex items-center space-x-2 w-full text-center text-sm text-muted-foreground'>
          <span className='inline'>Hiển thị</span>
          <span className='font-medium'>
            {pageIndex} / {totalPages}
          </span>
          <span className='inline'>trang</span>
        </div>

        {/* Page Size Selector */}
        <div className='flex h-full items-center justify-center w-full'>
          <div className='w-full flex justify-center'>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPageIndex(1);
              }}
            >
              <SelectTrigger className='w-[200px] mx-auto'>
                <SelectValue placeholder='Số dữ liệu trên trang' />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem
                    key={size}
                    value={size.toString()}
                    className='text-center'
                  >
                    {size} dòng / trang
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className='flex items-center justify-center w-full sm:w-auto mt-4 sm:mt-0'>
        <div className='flex items-center space-x-1'>
          {/* Previous Page Button */}
          <Button
            size='sm'
            variant='outline'
            disabled={!hasPreviousPage}
            className='p-1 sm:p-2'
            onClick={() => setPageIndex(pageIndex - 1)}
          >
            <ChevronLeft className='w-4 h-4' />
          </Button>

          {/* Page Buttons */}
          {paginationButtons}

          {/* Next Page Button */}
          <Button
            size='sm'
            variant='outline'
            disabled={!hasNextPage}
            className='p-1 sm:p-2'
            onClick={() => setPageIndex(pageIndex + 1)}
          >
            <ChevronRight className='w-4 h-4' />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TablePagination;
