import { httpClient } from '@/lib/http/client';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_BATCH_BYTES = 20 * 1024 * 1024;

function createUploadBatches(files: File[]) {
  const batches: File[][] = [];
  let currentBatch: File[] = [];
  let currentBytes = 0;

  for (const file of files) {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(`File ${file.name} exceeds the 10 MB image limit.`);
    }

    if (currentBatch.length > 0 && currentBytes + file.size > MAX_BATCH_BYTES) {
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

export async function uploadMediaImages(
  files: FileList,
  onProgress?: (percentage: number) => void
) {
  const uploadFiles = Array.from(files);
  const totalBytes = uploadFiles.reduce((total, file) => total + file.size, 0);
  const batches = createUploadBatches(uploadFiles);
  const uploaded = [];
  let completedBytes = 0;

  for (const batch of batches) {
    const formData = new FormData();
    batch.forEach((file) => formData.append('images', file, file.name));
    const batchBytes = batch.reduce((total, file) => total + file.size, 0);

    const response = await httpClient.post<unknown[]>('/media/images/bulk', formData, {
      onUploadProgress: (event) => {
        if (totalBytes > 0) {
          onProgress?.(
            Math.min(100, Math.round(((completedBytes + event.loaded) / totalBytes) * 100))
          );
        }
      },
    });
    uploaded.push(...response.data);
    completedBytes += batchBytes;
    onProgress?.(Math.min(100, Math.round((completedBytes / totalBytes) * 100)));
  }

  return uploaded;
}
