import { queryOptions } from '@tanstack/react-query';
import { getBachelorImport, getLatestBachelorImport } from '../api/bachelor-import';
import { getBachelors } from '../api/get-bachelors';
import { isImportFinished } from '../model/bachelor-import';
import type { BachelorListParams } from '../model/bachelor-page';

export const bachelorKeys = {
  all: ['bachelors'] as const,
  lists: () => [...bachelorKeys.all, 'list'] as const,
  list: (params: BachelorListParams) => [...bachelorKeys.lists(), params] as const,
};

export function bachelorListQueryOptions(params: BachelorListParams) {
  return queryOptions({
    queryKey: bachelorKeys.list(params),
    queryFn: () => getBachelors(params),
  });
}

export const IMPORT_POLL_MS = 1000;

export const bachelorImportKeys = {
  all: ['bachelors', 'import'] as const,
  job: (jobId: string | null) => [...bachelorImportKeys.all, 'job', jobId] as const,
  latest: () => [...bachelorImportKeys.all, 'latest'] as const,
};

/** Tiến độ một lần import; hỏi lại mỗi giây cho đến khi xong. */
export function bachelorImportQueryOptions(jobId: string | null) {
  return queryOptions({
    queryKey: bachelorImportKeys.job(jobId),
    queryFn: () => getBachelorImport(jobId!),
    enabled: jobId !== null,
    refetchInterval: (query) => (isImportFinished(query.state.data) ? false : IMPORT_POLL_MS),
    refetchIntervalInBackground: true,
  });
}

export function latestBachelorImportQueryOptions(enabled: boolean) {
  return queryOptions({
    queryKey: bachelorImportKeys.latest(),
    queryFn: getLatestBachelorImport,
    enabled,
    staleTime: 0,
  });
}
