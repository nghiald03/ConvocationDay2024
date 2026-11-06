'use client';

import {
  ColumnDef,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

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
import { Icon } from '../ui/icon';

import TablePagination from './table-pagination';
import LoaderData from '../loader-data';
import FetchingError from '../fetching-error';
import { safeIncludes } from '@/lib/safe-includes';

export type TableProps = {
  data: any[];
  columns: ColumnDef<any, CustomColumnMeta>[];
  isLoading?: boolean;
  isError?: boolean;
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
  // Thêm prop mới cho styling hàng
  rowClassName?: (row: any) => string;
};

type CustomColumnMeta = {
  align?: 'start' | 'center' | 'end';
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
  isError,
  columns,
  isLoading,
  title,
  header,
  overflow,
  rowClassName, // Thêm prop mới vào destructuring
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
            'flex-1 font-semibold tracking-tight text-default-900',
            !isDesktop ? 'text-base' : 'text-lg'
          )}
        >
          {title}
        </div>
        <div>{header}</div>
      </div>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className='hover:bg-transparent'>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className={cn(
                    safeIncludes(header.column.columnDef.meta, 'actions') ||
                      safeIncludes(header.column.columnDef.meta, 'select')
                      ? 'w-1'
                      : '',
                    header.column.getCanSort() && 'cursor-pointer select-none'
                  )}
                >
                  {!header.isPlaceholder && (
                    <div
                      className={cn(
                        'flex gap-1',
                        safeIncludes(header.column.columnDef.meta, 'end')
                          ? 'justify-end'
                          : safeIncludes(header.column.columnDef.meta, 'center')
                          ? 'justify-center'
                          : 'justify-start'
                      )}
                    >
                      {/* Label */}
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {/* Icon */}
                      {{
                        asc: (
                          <Icon icon='fa-solid:sort-up' className='text-sm' />
                        ),
                        desc: (
                          <Icon icon='fa-solid:sort-down' className='text-sm' />
                        ),
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className={cn(overflow && 'overflow-scroll')}>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className='h-24 text-center p-4'
              >
                <LoaderData isLoading={isLoading} />
              </TableCell>
            </TableRow>
          ) : isError ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className='h-24 text-center p-4'
              >
                <FetchingError isError={isError} />
              </TableCell>
            </TableRow>
          ) : !isLoading &&
            !isError &&
            table.getRowModel() &&
            table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <Fragment key={row.id}>
                <TableRow
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  className={cn(
                    (row.id === 'select' || row.id === 'actions') &&
                      'justify-center items-center',
                    // Thêm class tùy chỉnh cho hàng nếu có
                    rowClassName && rowClassName(row.original)
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        cell.column.columnDef.meta === 'end'
                          ? 'text-right'
                          : cell.column.columnDef.meta === 'center'
                          ? 'text-center'
                          : 'text-left'
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
                {row.getIsExpanded() && (
                  <TableRow className='bg-muted/30'>
                    <TableCell colSpan={columns.length} className=' p-4'>
                      {row.original.expandedContent}
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className='h-24 text-center p-4'
              >
                <p className='text-sm text-muted-foreground'>Không có dữ liệu</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {pageIndex &&
      pageSize &&
      totalItems &&
      totalPages &&
      !isLoading &&
      !isError &&
      hasNextPage !== undefined &&
      hasPreviousPage !== undefined &&
      setPageSize &&
      setPageIndex ? (
        <TablePagination
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          pageIndex={pageIndex}
          pageSize={pageSize}
          setPageIndex={setPageIndex}
          setPageSize={setPageSize}
          totalItems={totalItems}
          totalPages={totalPages}
        />
      ) : null}
    </div>
  );
};

export default TableCustom;
