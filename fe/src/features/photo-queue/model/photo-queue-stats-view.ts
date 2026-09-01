import type { PhotoQueueEntry } from './photo-queue';

export type PhotoQueueStatsSortField =
  | 'queueNumber'
  | 'studentCode'
  | 'fullName'
  | 'photoStatus';

type PhotoQueueStatsPageOptions = {
  search: string;
  sortField: PhotoQueueStatsSortField;
  sortDirection: 'asc' | 'desc';
  page: number;
  pageSize: number;
};

const statusLabels: Record<PhotoQueueEntry['photoStatus'], string> = {
  WAITING: 'Chưa chụp',
  PHOTOGRAPHED: 'Đã chụp',
  ABSENT: 'Vắng',
  CANCELLED: 'Đã hủy',
};

function normalizeSearchValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('vi');
}

function compareEntries(
  left: PhotoQueueEntry,
  right: PhotoQueueEntry,
  field: PhotoQueueStatsSortField,
) {
  if (field === 'queueNumber') return left.queueNumber - right.queueNumber;
  const leftValue = field === 'photoStatus' ? statusLabels[left.photoStatus] : left[field];
  const rightValue = field === 'photoStatus' ? statusLabels[right.photoStatus] : right[field];
  return leftValue.localeCompare(rightValue, 'vi', { sensitivity: 'base', numeric: true });
}

export function getPreviousWaitingPhotoQueueNumber(
  entries: PhotoQueueEntry[],
  currentNumber: number,
) {
  let previousNumber: number | null = null;
  for (const entry of entries) {
    if (
      entry.photoStatus === 'WAITING' &&
      entry.queueNumber < currentNumber &&
      (previousNumber === null || entry.queueNumber > previousNumber)
    ) {
      previousNumber = entry.queueNumber;
    }
  }
  return previousNumber;
}

export function getPhotoQueueStatsPage(
  entries: PhotoQueueEntry[],
  options: PhotoQueueStatsPageOptions,
) {
  const normalizedSearch = normalizeSearchValue(options.search.trim());
  const filtered = normalizedSearch
    ? entries.filter((entry) =>
        normalizeSearchValue(
          [
            entry.queueNumber,
            entry.studentCode,
            entry.fullName,
            entry.major ?? '',
            statusLabels[entry.photoStatus],
          ].join(' '),
        ).includes(normalizedSearch),
      )
    : [...entries];
  const direction = options.sortDirection === 'asc' ? 1 : -1;
  filtered.sort(
    (left, right) => compareEntries(left, right, options.sortField) * direction,
  );

  const pageSize = Math.max(1, options.pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(1, options.page), totalPages);
  const offset = (page - 1) * pageSize;

  return {
    entries: filtered.slice(offset, offset + pageSize),
    totalEntries: filtered.length,
    totalPages,
    page,
  };
}
