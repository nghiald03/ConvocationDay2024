'use client';

import { ChangeEvent, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { uploadPhotoQueueAssignments } from '../api/photo-queue-api';
import type { PhotoQueueAssignmentInput } from '../model/photo-queue';
import { getHttpErrorMessage } from '@/lib/http/get-http-error-message';
import toast from 'react-hot-toast';

export function PhotoQueueAssignmentUpload({ photoSessionId }: { photoSessionId: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const upload = useMutation({
    mutationFn: uploadPhotoQueueAssignments,
    onSuccess: () => {
      if (inputRef.current) inputRef.current.value = '';
      toast.success('Đã upload danh sách tân cử nhân theo phiên chụp.');
      void queryClient.invalidateQueries({ queryKey: ['photo-queue'] });
    },
    onError: (error) => toast.error(getHttpErrorMessage(error, 'Upload danh sách thất bại.')),
  });

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !photoSessionId) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const workbook = XLSX.read(loadEvent.target?.result as ArrayBuffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      const input: PhotoQueueAssignmentInput[] = rows
        .map((row) => ({
          photoSessionId: Number(photoSessionId),
          studentCode: String(row.MSSV ?? row.studentCode ?? row.StudentCode ?? '').trim(),
          requiresCoordinator: String(row.requiresCoordinator ?? row.can_dieu_phoi ?? '').toLowerCase() === 'true',
          note: String(row.note ?? row.ghi_chu ?? '').trim() || undefined,
        }))
        .filter((row) => row.studentCode);
      upload.mutate(input);
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <div className='rounded-lg border bg-card p-4 text-card-foreground shadow-sm'>
      <label className='text-sm font-semibold' htmlFor='photo-assignment-file'>
        Upload danh sách MSSV cho phiên chụp ảnh
      </label>
      <div className='mt-3 flex flex-col gap-3 md:flex-row'>
        <Input
          ref={inputRef}
          id='photo-assignment-file'
          type='file'
          accept='.xlsx,.xls'
          onChange={handleFile}
          disabled={!photoSessionId || upload.isPending}
        />
        <Button type='button' variant='outline' disabled>
          <Upload className='mr-2 h-4 w-4' />
          {upload.isPending ? 'Đang upload' : 'Excel'}
        </Button>
      </div>
    </div>
  );
}
