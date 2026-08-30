import type { Bachelor } from './bachelor';

export type BachelorListParams = {
  pageIndex: number;
  pageSize: number;
  search?: string;
  hall?: string;
  session?: string;
};

export type BachelorPage = {
  items: Bachelor[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};
