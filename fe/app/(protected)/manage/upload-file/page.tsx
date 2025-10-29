'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// ===== shadcn/ui =====
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// ===== lib =====
import { cn } from '@/lib/utils';
import { uploader } from '@/lib/uploader';

// ===== Icons =====
import {
  Plus,
  Upload,
  Search,
  MoreVertical,
  Copy,
  Trash2,
  Pencil,
  RefreshCcw,
  Link as LinkIcon,
  ImageIcon,
  Lock,
  Unlock,
  Filter,
  FileDown,
} from 'lucide-react';

// ===== Types =====
type ImageMeta = {
  id: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  width: number;
  height: number;
  createdAt: string;
};

export default function Page() {
  // State
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [exporting, setExporting] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [current, setCurrent] = useState<ImageMeta | null>(null);
  const [newName, setNewName] = useState<string>('');

  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState<
    'newest' | 'oldest' | 'size_desc' | 'size_asc'
  >('newest');

  // Resize UI (client-side only; wiring to API optional)
  const [resizeW, setResizeW] = useState<string>('');
  const [resizeH, setResizeH] = useState<string>('');
  const [lockAR, setLockAR] = useState<boolean>(true);

  const dragRef = useRef<HTMLLabelElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const queryClient = useQueryClient();

  // ===== Fetch images =====
  const {
    data: images = [],
    isLoading,
    isFetching,
  } = useQuery<ImageMeta[]>({
    queryKey: ['images'],
    queryFn: async () => {
      const { data } = await uploader.get('/api/images', {
        params: { _: Date.now() },
      });
      return data.sort(
        (a: ImageMeta, b: ImageMeta) =>
          +new Date(b.createdAt) - +new Date(a.createdAt)
      );
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: 30000, // 30s
  });

  // Derived
  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    let arr = images.filter((i) =>
      kw
        ? i.originalName.toLowerCase().includes(kw) ||
          i.mimeType.toLowerCase().includes(kw)
        : true
    );

    switch (sortBy) {
      case 'oldest':
        arr = [...arr].sort(
          (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)
        );
        break;
      case 'size_desc':
        arr = [...arr].sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
        break;
      case 'size_asc':
        arr = [...arr].sort((a, b) => (a.size ?? 0) - (b.size ?? 0));
        break;
      default:
        arr = [...arr].sort(
          (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
        );
    }
    return arr;
  }, [images, q, sortBy]);

  const formattedSize = useMemo(
    () => formatFileSize(images.reduce((s, i) => s + (i.size || 0), 0)),
    [images]
  );

  // ===== Mutations =====
  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('images', f, f.name));
      await uploader.post('/api/images', fd, {
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      });
    },
    onSuccess: async () => {
      toast.success('Tải lên thành công');
      setUploadProgress(0);
      setSelectedFiles(null);
      await queryClient.invalidateQueries({ queryKey: ['images'] });
    },
    onError: (e: any) => {
      console.error(e);
      toast.error('Tải lên thất bại');
      setUploadProgress(0);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (body: { id: string; originalName: string }) =>
      uploader.patch(`/api/images/${body.id}`, {
        originalName: body.originalName,
      }),
    onSuccess: async () => {
      toast.success('Đổi tên thành công');
      await queryClient.invalidateQueries({ queryKey: ['images'] });
    },
    onError: () => toast.error('Đổi tên thất bại'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => uploader.delete(`/api/images/${id}`),
    onSuccess: async () => {
      toast.success('Đã xóa ảnh');
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['images'] });
    },
    onError: () => toast.error('Xóa ảnh thất bại'),
  });

  // ===== Handlers =====
  // ===== Export Excel mutation =====
  const exportExcelMutation = useMutation({
    mutationFn: async () => {
      const res = await uploader.get('/api/export-xlsx', {
        responseType: 'blob', // cần blob để tải file
      });
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'images.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => toast.success('Đã xuất Excel'),
    onError: (err) => {
      console.error(err);
      toast.error('Xuất Excel thất bại');
    },
  });

  const handleFileChange = (files: FileList | null) => {
    if (!files || files.length === 0) {
      setSelectedFiles(null);
      return;
    }

    const invalids = Array.from(files).filter((f) => f.type !== 'image/png');
    invalids.forEach((f) =>
      toast.error(`File ${f.name} không đúng định dạng (chỉ PNG)`)
    );

    const valids = Array.from(files).filter((f) => f.type === 'image/png');
    if (valids.length === 0) {
      setSelectedFiles(null);
      toast.error('Không có file PNG hợp lệ');
      return;
    }
    const dt = new DataTransfer();
    valids.forEach((f) => dt.items.add(f));
    setSelectedFiles(dt.files);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    handleFileChange(files);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragRef.current) return;
    dragRef.current.classList.add('ring-2', 'ring-primary');
  }, []);

  const onDragLeave = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current.classList.remove('ring-2', 'ring-primary');
  }, []);

  const handleUpload = () => {
    if (!selectedFiles) return toast.error('Chưa chọn file');
    uploadMutation.mutate(selectedFiles);
  };

  const handleUpdateName = () => {
    if (!current || !newName.trim()) return toast.error('Tên không hợp lệ');
    updateMutation.mutate({ id: current.id, originalName: newName.trim() });
  };

  const handleDelete = () => {
    if (!current) return;
    if (confirm(`Xóa ảnh "${current.originalName}"?`))
      deleteMutation.mutate(current.id);
  };

  const copyUrl = async (url: string) => {
    try {
      // Build full URL: if url is already absolute, use it; otherwise prefix with current origin
      let full = url;
      if (typeof window !== 'undefined') {
        const origin = window.location.origin;
        if (!/^https?:\/\//i.test(url)) {
          full = url.startsWith('/') ? origin + url : origin + '/' + url;
        }
      }

      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {
        await navigator.clipboard.writeText(full);
      } else {
        // Fallback for older browsers or non-secure contexts
        const ta = document.createElement('textarea');
        ta.value = full;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (!ok) throw new Error('execCommand failed');
      }
      toast.success('Đã copy URL');
    } catch (err) {
      console.error('Copy failed', err);
      toast.error('Không thể copy URL');
    }
  };

  // ===== UI =====
  return (
    <>
      {/* Header */}
      <Card className='bg-gradient-to-br from-orange-50 to-amber-100 border-0 shadow-sm'>
        <CardContent className='p-4'>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href='/'>Trang chủ</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Kho ảnh</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className='mt-3 flex items-center justify-between gap-3'>
            <div>
              <h1 className='text-xl font-semibold tracking-tight'>
                Upload & Quản lý hình
              </h1>
              <p className='text-sm text-muted-foreground'>
                {images.length.toLocaleString('vi-VN')} ảnh • {formattedSize}
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ['images'] })
                }
              >
                <RefreshCcw className='size-4 mr-2' /> Làm mới
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => exportExcelMutation.mutate()}
                disabled={exportExcelMutation.isPending}
              >
                <FileDown className='size-4 mr-2' />
                {exportExcelMutation.isPending ? 'Đang xuất…' : 'Xuất Excel'}
              </Button>

              <Button size='sm' onClick={() => fileInputRef.current?.click()}>
                <Upload className='size-4 mr-2' /> Chọn ảnh
              </Button>
              <input
                ref={fileInputRef}
                id='file'
                type='file'
                accept='.png'
                multiple
                className='hidden'
                onChange={(e) => handleFileChange(e.target.files)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toolbar */}
      <Card className='mt-3'>
        <CardContent className='p-3 flex flex-col md:flex-row gap-3 md:items-center md:justify-between'>
          <div className='flex items-center gap-2 w-full md:w-1/2'>
            <div className='relative flex-1'>
              <Search className='absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
              <Input
                placeholder='Tìm theo tên hoặc MIME…'
                className='pl-8'
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Badge color='secondary' className='whitespace-nowrap'>
              PNG only
            </Badge>
          </div>

          <div className='flex items-center gap-2 justify-between md:justify-end'>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' size='sm' className='gap-2'>
                  <Filter className='size-4' /> Sắp xếp
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-44'>
                <DropdownMenuLabel>Thứ tự</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={sortBy === 'newest'}
                  onCheckedChange={() => setSortBy('newest')}
                >
                  Mới nhất
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={sortBy === 'oldest'}
                  onCheckedChange={() => setSortBy('oldest')}
                >
                  Cũ nhất
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={sortBy === 'size_desc'}
                  onCheckedChange={() => setSortBy('size_desc')}
                >
                  Dung lượng ↓
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={sortBy === 'size_asc'}
                  onCheckedChange={() => setSortBy('size_asc')}
                >
                  Dung lượng ↑
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Drag & Drop */}
      <Card className='mt-3'>
        <CardContent className='p-3'>
          <label
            ref={dragRef}
            htmlFor='file-hidden'
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={cn(
              'flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all bg-muted/40',
              selectedFiles && selectedFiles.length > 0
                ? 'border-primary/50'
                : 'hover:bg-muted'
            )}
          >
            <ImageIcon className='size-6' />
            <div className='text-sm font-medium'>Kéo & thả ảnh PNG vào đây</div>
            <div className='text-xs text-muted-foreground'>
              hoặc bấm để chọn từ máy
            </div>
            <Input
              id='file-hidden'
              type='file'
              accept='.png'
              multiple
              className='hidden'
              onChange={(e) => handleFileChange(e.target.files)}
            />
          </label>

          {selectedFiles && selectedFiles.length > 0 && (
            <div className='mt-3 flex items-center justify-between gap-2'>
              <div className='text-xs text-muted-foreground'>
                Đã chọn{' '}
                <span className='font-medium'>{selectedFiles.length}</span> file
              </div>
              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setSelectedFiles(null)}
                >
                  Bỏ chọn
                </Button>
                <Button
                  size='sm'
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? 'Đang tải…' : 'Tải lên'}
                </Button>
              </div>
            </div>
          )}

          {uploadProgress > 0 && (
            <Progress value={uploadProgress} className='mt-2' />
          )}
        </CardContent>
      </Card>

      {/* Grid */}
      <Card className='mt-3'>
        <CardHeader className='pb-2'>
          <CardTitle className='text-base'>
            Thư viện{' '}
            {isFetching && (
              <span className='text-xs text-muted-foreground'>
                (đang đồng bộ…)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className='p-3'>
          {isLoading ? (
            <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className='aspect-square w-full rounded' />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className='py-12 text-center text-sm text-muted-foreground'>
              Không tìm thấy ảnh phù hợp
            </div>
          ) : (
            <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3'>
              {filtered.map((img) => (
                <figure
                  key={img.id}
                  className='group border rounded-xl overflow-hidden bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60'
                >
                  <div
                    className='relative aspect-square bg-muted overflow-hidden'
                    onClick={() => {
                      setOpen(true);
                      setCurrent(img);
                      setNewName(img.originalName);
                      setResizeW('');
                      setResizeH('');
                    }}
                  >
                    <Image
                      src={img.path}
                      alt={img.originalName}
                      fill
                      sizes='(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw'
                      className='object-cover transition-transform duration-300 group-hover:scale-105'
                    />
                  </div>
                  <figcaption className='p-2'>
                    <div
                      className='text-xs font-medium truncate'
                      title={img.originalName}
                    >
                      {img.originalName}
                    </div>
                    <div className='text-[11px] text-muted-foreground flex items-center justify-between mt-1'>
                      <span>
                        {img.width || 0}×{img.height || 0}
                      </span>
                      <span>{formatFileSize(img.size || 0)}</span>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </CardContent>
        {isFetching && (
          <CardFooter className='pt-0'>
            <Progress value={100} className='h-1' />
          </CardFooter>
        )}
      </Card>

      {/* Detail Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size='md'>
          <DialogHeader>
            <DialogTitle>Chi tiết ảnh</DialogTitle>
          </DialogHeader>

          {current && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <div className='relative w-full aspect-square bg-muted rounded-lg overflow-hidden'>
                  <Image
                    src={current.path}
                    alt={current.originalName}
                    fill
                    className='object-contain'
                  />
                </div>
                <div className='grid grid-cols-3 gap-2 mt-3'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => copyUrl(current.path)}
                  >
                    <Copy className='size-4 mr-2' /> Copy URL
                  </Button>
                  <a
                    href={current.path}
                    target='_blank'
                    rel='noreferrer'
                    className='contents'
                  >
                    <Button variant='outline' size='sm'>
                      <LinkIcon className='size-4 mr-2' /> Mở ảnh
                    </Button>
                  </a>
                  <Button color='destructive' size='sm' onClick={handleDelete}>
                    <Trash2 className='size-4 mr-2' /> Xóa ảnh
                  </Button>
                </div>
              </div>

              <div>
                <Label className='text-xs'>Đổi tên ảnh</Label>
                <div className='flex gap-2 my-2'>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <Button
                    onClick={handleUpdateName}
                    size='md'
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? 'Đang lưu…' : 'Lưu'}
                  </Button>
                </div>

                <Textarea
                  readOnly
                  className='text-xs'
                  value={`ID: ${current.id}\nSize: ${current.width}x${
                    current.height
                  }\nMIME: ${current.mimeType}\nTạo lúc: ${new Date(
                    current.createdAt
                  ).toLocaleString('vi-VN')}\nURL: ${current.path}`}
                />

                <div className='mt-3 space-y-2'>
                  <div className='flex items-center justify-between'>
                    <Label className='text-xs'>Giữ tỉ lệ</Label>
                    <Button
                      type='button'
                      variant='outline'
                      size='icon'
                      onClick={() => setLockAR((v) => !v)}
                      aria-label='Toggle aspect ratio lock'
                    >
                      {lockAR ? (
                        <Lock className='size-4' />
                      ) : (
                        <Unlock className='size-4' />
                      )}
                    </Button>
                  </div>
                  <div className='grid grid-cols-2 gap-2'>
                    <Input
                      type='number'
                      placeholder='Width'
                      value={resizeW}
                      onChange={(e) => {
                        const v = e.target.value;
                        setResizeW(v);
                        if (lockAR && current?.width && current?.height && v) {
                          const r =
                            Number(v) * (current.height / current.width);
                          setResizeH(Math.max(1, Math.round(r)).toString());
                        }
                      }}
                    />
                    <Input
                      type='number'
                      placeholder='Height'
                      value={resizeH}
                      onChange={(e) => {
                        const v = e.target.value;
                        setResizeH(v);
                        if (lockAR && current?.width && current?.height && v) {
                          const r =
                            Number(v) * (current.width / current.height);
                          setResizeW(Math.max(1, Math.round(r)).toString());
                        }
                      }}
                    />
                  </div>
                  <Button color='secondary' disabled>
                    <Upload className='size-4 mr-2' /> Resize (liên kết API sau)
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ===== Utils =====
function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}
