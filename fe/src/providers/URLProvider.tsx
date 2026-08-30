// components/ClientQueryProvider.tsx
'use client'; // Ensures the component is a client component

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import React, { useEffect } from 'react';

export default function URLProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [url, setUrl] = React.useState('');
  const [open, setOpen] = React.useState(false);
  useEffect(() => {
    const url = window.localStorage.getItem('url');
    if (url) {
      setOpen(false);
    } else {
      setOpen(true);
    }
    console.log(url);
  }, [url]);

  const handleUpdate = () => {
    window.localStorage.setItem('url', url);
    setOpen(false);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
        }}
      >
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Cập nhật URL</DialogTitle>
            <DialogDescription>
              Có vẻ bạn chưa cập nhật url để kết nối với server
            </DialogDescription>
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
            <Button onClick={handleUpdate} type='submit'>
              Cập nhật
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {children}
    </>
  );
}
