'use client';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { manageAPI } from '@/config/axios';
import { cn } from '@/lib/utils';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import React, { use, useState } from 'react';
import toast from 'react-hot-toast';

export default function Page() {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      console.log('Files:', files);
      const ortherFiles = Array.from(files).filter(
        (file) => file.type !== 'image/png'
      );
      console.log('Orther Files:', ortherFiles);
      if (ortherFiles.length > 0) {
        ortherFiles.forEach((file) => {
          toast.error(`File ${file.name} không đúng định dạng`, {
            duration: 3000,
            position: 'top-right',
          });
        });
      }
      const newFiles = Array.from(files).filter(
        (file) => file.type === 'image/png'
      );
      if (newFiles.length > 0) {
        console.log('New Files:', newFiles);
        const dataTransfer = new DataTransfer();
        newFiles.forEach((file) => dataTransfer.items.add(file));
        setSelectedFiles(dataTransfer.files);
      } else {
        setSelectedFiles(null);
        toast.error('Không có file hợp lệ', {
          duration: 5000,
          position: 'top-right',
        });
      }
    }
  };

  const addBachelorFromFile = useMutation({
    mutationFn: (formData: FormData) => {
      return axios.post(
        process.env.NEXT_PUBLIC_URL_UPLOAD_IMAGE
          ? process.env.NEXT_PUBLIC_URL_UPLOAD_IMAGE + '/upload'
          : 'http://fjourney.site:3214/upload',
        formData,
        {
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded / progressEvent.total) * 100
              );
              setUploadProgress(percentCompleted); // Cập nhật tiến trình
            }
          },
        }
      );
    },
    onSuccess: () => {
      toast.success('Thêm thành công', {
        duration: 3000,
        position: 'top-right',
      });
      setUploadProgress(0); // Reset tiến trình sau khi thành công
    },
    onError: (error: any) => {
      toast.error('Thêm thất bại ' + error.response?.data || '', {
        duration: 3000,
        position: 'top-right',
      });
      setUploadProgress(0); // Reset tiến trình nếu lỗi xảy ra
    },
  });

  const handleUpload = () => {
    if (selectedFiles) {
      console.log('Selected Files:', selectedFiles);
      const formData = new FormData();
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('file', selectedFiles[i]);
      }
      addBachelorFromFile.mutate(formData);
    }
  };

  const exportToExcel = () => {
    axios
      .get(
        process.env.NEXT_PUBLIC_URL_UPLOAD_IMAGE
          ? process.env.NEXT_PUBLIC_URL_UPLOAD_IMAGE + '/exportToExcel'
          : 'http://fjourney.site:3214/exportToExcel',
        {
          responseType: 'arraybuffer',
        }
      )
      .then((response: { data: BlobPart }) => {
        // Tạo một tệp Excel từ dữ liệu binary
        const blob = new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'files.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch((error: any) => {
        console.error('Error exporting to Excel:', error);
      });
  };
  return (
    <>
      <Card>
        <CardContent className='p-3'>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href='/'>Trang chủ</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Upload hình tân cử nhân</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </CardContent>
      </Card>

      <Card className='mt-3'>
        <CardContent className='p-3'>
          <div className='flex-col gap-2'>
            <div className={cn('flex-col w-full items-center gap-1.5')}>
              <Label htmlFor='file'>Tải lên toàn bộ hình của TCN</Label>
              <Input
                onChange={handleFileChange}
                multiple
                id='file'
                type='file'
                accept='.png'
              />
            </div>
            {uploadProgress > 0 && (
              <div className='mt-2 w-full'>
                <Progress
                  value={uploadProgress}
                  size='lg'
                  color='warning'
                  showValue
                />
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <div className='flex gap-2 w-full'>
            <div className='flex-1 w-full '></div>
            <Button
              variant='outline'
              onClick={() => {
                exportToExcel();
              }}
              color='primary'
            >
              Tải danh sách hình đã upload
            </Button>
            <Button
              disabled={addBachelorFromFile.isPending}
              onClick={handleUpload}
              variant='default'
              color='primary'
            >
              Tải lên
            </Button>
          </div>
        </CardFooter>
      </Card>
    </>
  );
}
