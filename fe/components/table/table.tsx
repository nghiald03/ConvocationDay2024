'use client';

import {
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import TablePagination from '@/app/(protected)/table/react-table/example2/table-pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Fragment, useState } from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';

export type TableProps = {
  data: any[];
  columns: any[];
  isLoading?: boolean;
  title: string;
  header?: React.ReactNode;
  overflow?: boolean;
  pageSize?: number;
  pageIndex?: number;
  totalItems?: number;
  totalPages?: number;
  currentPage?: number;
  setCurrentPage?: (currentPage: number) => void;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  setPageSize?: (pageSize: number) => void;
  setPageIndex?: (pageIndex: number) => void;
};

const TableCustom = ({
  hasNextPage,
  hasPreviousPage,
  pageIndex,
  pageSize,
  setPageIndex,
  setPageSize,
  totalItems,
  totalPages,
  data,
  columns,
  isLoading,
  title,
  header,
  overflow,
}: TableProps) => {
  const [sorting, setSorting] = useState<SortingState>([]);

  const [expanded, setExpanded] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      expanded,
      rowSelection,
    },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getExpandedRowModel: getExpandedRowModel(),
  });
  const isDesktop = useMediaQuery('(min-width: 1280px)');

  return (
    <div className='w-full'>
      <div className='flex items-center py-4 '>
        <div
          className={cn(
            'flex-1  font-normal text-default-900',
            !isDesktop ? 'text-sm' : 'text-base'
          )}
        >
          {title}
        </div>
        <div>
          {/* <Input
            placeholder='Filter Status...'
            value={
              (table.getColumn('status')?.getFilterValue() as string) ?? ''
            }
            onChange={(event) =>
              table.getColumn('status')?.setFilterValue(event.target.value)
            }
            className='max-w-sm'
          /> */}
          {header}
        </div>
      </div>

      <Table>
        <TableHeader className='bg-default-200'>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className={cn(overflow && 'overflow-scroll')}>
          {!isLoading &&
          table.getRowModel() &&
          table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <Fragment key={row.id}>
                <TableRow
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  className='cursor-pointer'
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
                {row.getIsExpanded() && (
                  <TableRow>
                    <TableCell colSpan={columns.length} className=' p-4'>
                      {row.original.expandedContent}
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className='h-24 text-center'>
                No results.
              </TableCell>
            </TableRow>
          )}
          {isLoading && (
            <TableRow>
              <TableCell colSpan={columns.length} className='h-32 text-center'>
                <Image src='/LoadingAnimation.webm' alt='loading'></Image>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {/* Pagination could be added here if you uncomment and configure TablePagination */}
      {pageIndex &&
        pageSize &&
        totalItems &&
        totalPages &&
        hasNextPage !== undefined &&
        hasPreviousPage !== undefined &&
        setPageSize &&
        setPageIndex && (
          <TablePagination
            hasNextPage={hasNextPage}
            hasPreviousPage={hasPreviousPage}
            pageIndex={pageIndex}
            pageSize={pageSize}
            setPageIndex={setPageIndex}
            setPageSize={setPageSize}
            totalItems={totalItems}
            totalPages={totalPages}
          ></TablePagination>
        )}
    </div>
  );
};

export default TableCustom;
