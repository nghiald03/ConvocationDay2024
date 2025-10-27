'use client';
import React from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { X } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import Link from "next/link";
import { Icon } from '@/components/ui/icon';
import { useConfig } from '@/hooks/use-config';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useMutation } from '@tanstack/react-query';
import { testing } from '@/config/axios';
import toast from 'react-hot-toast';

const HeaderSearch = () => {
  const [config] = useConfig();
  const [url, setUrl] = React.useState(
    window.localStorage.getItem('url') || ''
  );

  const checkConnect = useMutation({
    mutationFn: () => {
      return testing.connect();
    },
    onSuccess: () => {
      toast.success('Kết nối tới server thành công', {
        position: 'top-right',
      });
    },
    onError: () => {
      toast.error('Kết nối tới server thất bại', {
        position: 'top-right',
      });
    },
  });
  const handleUpdate = () => {
    window.localStorage.setItem('url', url);
    checkConnect.mutate();
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };
  if (config.layout === 'horizontal') return null;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type='button'
          className='flex items-center xl:text-sm text-lg xl:text-default-400 text-default-800 dark:text-default-700 gap-3'
        >
          Server
          <span className='inline-block '>{url}</span>
        </button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Cập nhật URL</DialogTitle>
        </DialogHeader>
        <div className='grid gap-4 py-4 w-full'>
          <div className='grid grid-cols-6 items-center gap-4 w-full'>
            <Label htmlFor='name' className='text-right'>
              URL
            </Label>
            <div className='col-span-5'>
              <Input
                id='name'
                value={url}
                onChange={handleUrlChange}
                className='col-span-3 min-w-full'
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose>
            <Button onClick={handleUpdate} type='submit'>
              Cập nhật
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HeaderSearch;
