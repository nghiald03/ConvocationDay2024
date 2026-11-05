import { httpClient } from '@/lib/http/client';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_BATCH_BYTES = 20 * 1024 * 1024;
// Must stay in sync with MAX_BULK_FILES in be-nest/src/media/media-validator.service.ts.
const MAX_BATCH_FILES = 20;
const BATCH_TIMEOUT_MS = 120_000;
const SUPPORTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg']);

export const SUPPORTED_IMAGE_ACCEPT = '.png,.jpg,.jpeg';

export function isSupportedImage(file: File) {
  return SUPPORTED_IMAGE_TYPES.has(file.type);
}

export function createUploadBatches(files: File[]) {
  const batches: File[][] = [];
  let currentBatch: File[] = [];
  let currentBytes = 0;

  for (const file of files) {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(`File ${file.name} exceeds the 10 MB image limit.`);
    }

    if (
      currentBatch.length >= MAX_BATCH_FILES ||
      (currentBatch.length > 0 && currentBytes + file.size > MAX_BATCH_BYTES)
    ) {
      batches.push(currentBatch);
      currentBatch = [];
      currentBytes = 0;
    }

    currentBatch.push(file);
    currentBytes += file.size;
  }

  if (currentBatch.length > 0) batches.push(currentBatch);
  return batches;
}

async function postBatch(batch: File[], onLoaded?: (loaded: number) => void) {
  const formData = new FormData();
  batch.forEach((file) => formData.append('images', file, file.name));
  const response = await httpClient.post<unknown[]>('/media/images/bulk', formData, {
    timeout: BATCH_TIMEOUT_MS,
    onUploadProgress: (event) => onLoaded?.(event.loaded),
  });
  return response.data;
}

export async function uploadMediaImages(
  files: File[] | FileList,
  onProgress?: (percentage: number) => void
) {
  const uploadFiles = Array.from(files);
  const totalBytes = uploadFiles.reduce((total, file) => total + file.size, 0);
  const batches = createUploadBatches(uploadFiles);
  const uploaded: unknown[] = [];
  const failed: File[] = [];
  let completedBytes = 0;

  const report = (bytes: number) => {
    if (totalBytes > 0) {
      onProgress?.(Math.min(100, Math.round((bytes / totalBytes) * 100)));
    }
  };

  for (const batch of batches) {
    try {
      uploaded.push(
        ...(await postBatch(batch, (loaded) => report(completedBytes + loaded)))
      );
    } catch {
      // The backend rolls back a whole batch on any error, so retry file by file:
      // one corrupt image must not lose its neighbours or stop the remaining batches.
      for (const file of batch) {
        try {
          uploaded.push(...(await postBatch([file])));
        } catch {
          failed.push(file);
        }
      }
    }
    completedBytes += batch.reduce((total, file) => total + file.size, 0);
    report(completedBytes);
  }

  return { uploaded, failed };
}
