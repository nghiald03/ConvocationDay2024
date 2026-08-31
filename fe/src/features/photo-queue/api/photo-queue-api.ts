import type { ApiResponse } from '@/lib/http/api-response';
import { httpClient } from '@/lib/http/client';
import type {
  PhotoQueueAuditLog,
  PhotoQueueAssignmentInput,
  PhotoQueueBachelorLookup,
  PhotoQueueKioskLookup,
  PhotoQueuePublicState,
  PhotoQueueRequestResult,
  PhotoQueueSession,
  PhotoQueueStats,
} from '../model/photo-queue';

export async function getPhotoQueueSessions() {
  const response = await httpClient.get<ApiResponse<PhotoQueueSession[]>>('/PhotoQueue/Sessions');
  return response.data.data ?? [];
}

export async function createPhotoQueueSession(name: string, description?: string) {
  const response = await httpClient.post<ApiResponse<PhotoQueueSession>>('/PhotoQueue/Sessions', {
    name,
    description,
  });
  if (!response.data.data) throw new Error(response.data.message || 'Không tạo được phiên chụp ảnh.');
  return response.data.data;
}

export async function getActivePhotoQueueSession() {
  const response = await httpClient.get<ApiResponse<PhotoQueueSession | null>>(
    '/PhotoQueue/ActiveSession'
  );
  return response.data.data ?? null;
}

export async function activatePhotoQueueKioskSession(photoSessionId: string) {
  const response = await httpClient.put('/PhotoQueue/Sessions/ActivateKiosk', undefined, {
    params: { photoSessionId },
  });
  return response.data;
}

export async function uploadPhotoQueueAssignments(input: PhotoQueueAssignmentInput[]) {
  const response = await httpClient.post('/PhotoQueue/Assignments', input);
  return response.data;
}

export async function lookupPhotoQueueBachelor(studentCode: string) {
  const response = await httpClient.get<ApiResponse<PhotoQueueBachelorLookup>>(
    '/PhotoQueue/LookupBachelor',
    { params: { studentCode } }
  );
  if (!response.data.data) throw new Error(response.data.message || 'Không tìm thấy tân cử nhân.');
  return response.data.data;
}

export async function coordinatorIssuePhotoQueueNumber(input: {
  studentCode: string;
  photoSessionId: string;
  reason: string;
}) {
  const response = await httpClient.post<ApiResponse<PhotoQueueRequestResult>>(
    '/PhotoQueue/CoordinatorIssueNumber',
    { ...input, photoSessionId: Number(input.photoSessionId) }
  );
  if (!response.data.data) throw new Error(response.data.message || 'Không cấp được số.');
  return response.data.data;
}

export async function confirmPhotoQueueCurrent(input: {
  photoSessionId: string;
  photographed: boolean;
  retouchNoteImage1?: string;
  retouchNoteImage2?: string;
}) {
  const response = await httpClient.put(
    '/PhotoQueue/ConfirmCurrent',
    {
      photographed: input.photographed,
      retouchNoteImage1: input.retouchNoteImage1,
      retouchNoteImage2: input.retouchNoteImage2,
    },
    { params: { photoSessionId: input.photoSessionId } }
  );
  return response.data;
}

export async function requestPhotoQueueNumber(studentCode: string) {
  const response = await httpClient.post<ApiResponse<PhotoQueueRequestResult>>(
    '/PhotoQueue/RequestNumber',
    { studentCode }
  );
  if (!response.data.data) throw new Error(response.data.message || 'Không lấy được số thứ tự.');
  return response.data.data;
}

export async function lookupPhotoQueueKiosk(studentCode: string) {
  const response = await httpClient.post<ApiResponse<PhotoQueueKioskLookup>>(
    '/PhotoQueue/KioskLookup',
    { studentCode }
  );
  if (!response.data.data) throw new Error(response.data.message || 'Không tra cứu được thông tin.');
  return response.data.data;
}

export async function getPhotoQueuePublicState(photoSessionId?: string) {
  const response = await httpClient.get<ApiResponse<PhotoQueuePublicState>>(
    '/PhotoQueue/PublicState',
    { params: photoSessionId ? { photoSessionId } : undefined }
  );
  if (!response.data.data) throw new Error(response.data.message || 'Không tải được số hiện tại.');
  return response.data.data;
}

export async function movePhotoQueueNext(photoSessionId: string) {
  const response = await httpClient.put('/PhotoQueue/Next', undefined, {
    params: { photoSessionId },
  });
  return response.data;
}

export async function movePhotoQueuePrevious(photoSessionId: string) {
  const response = await httpClient.put('/PhotoQueue/Previous', undefined, {
    params: { photoSessionId },
  });
  return response.data;
}

export async function setPhotoQueueNumber(photoSessionId: string, queueNumber: number) {
  const response = await httpClient.put(
    '/PhotoQueue/SetNumber',
    { queueNumber },
    { params: { photoSessionId } }
  );
  return response.data;
}

export async function getPhotoQueueStats(photoSessionId: string) {
  const response = await httpClient.get<ApiResponse<PhotoQueueStats>>('/PhotoQueue/Stats', {
    params: { photoSessionId },
  });
  if (!response.data.data) throw new Error(response.data.message || 'Không tải được thống kê.');
  return response.data.data;
}

export async function getPhotoQueueAuditLogs(photoSessionId: string) {
  const response = await httpClient.get<ApiResponse<PhotoQueueAuditLog[]>>(
    '/PhotoQueue/AuditLogs',
    { params: { photoSessionId, limit: 80 } }
  );
  return response.data.data ?? [];
}
