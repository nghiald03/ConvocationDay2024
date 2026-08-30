'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { searchBachelors } from '@/features/bachelor/api/search-bachelors';
import type { Bachelor } from '@/features/bachelor/model/bachelor';

const formSchema = z.object({
  seatLocation: z.string().trim().min(1, 'Vui lòng nhập tên hoặc mã sinh viên'),
});

export default function SeatLocationSearch() {
  const [searchResult, setSearchResult] = useState<Bachelor[]>([]);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { seatLocation: '' },
  });

  const searchLocation = useMutation({
    mutationFn: searchBachelors,
    onError: (_error, search) => {
      setSearchResult([]);
      toast.error(`Không tìm thấy chỗ ngồi của tân cử nhân ${search}`, {
        duration: 3000,
        position: 'top-right',
      });
    },
    onSuccess: (data, search) => {
      setSearchResult(data.items);
      toast.success(`Tìm thấy ${data.items.length} kết quả cho ${search}`, {
        duration: 3000,
        position: 'top-right',
      });
    },
  });

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(({ seatLocation }) =>
            searchLocation.mutate(seatLocation)
          )}
          className='w-full space-y-8 pt-3'
        >
          <FormField
            control={form.control}
            name='seatLocation'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tìm kiếm theo tên tân cử nhân hoặc MSSV</FormLabel>
                <FormControl>
                  <div className='flex gap-2'>
                    <Input {...field} className='h-full flex-1' />
                    <Button
                      type='submit'
                      color='primary'
                      disabled={searchLocation.isPending}
                    >
                      Tìm kiếm
                    </Button>
                  </div>
                </FormControl>
                <FormDescription>
                  Nhập tên hoặc MSSV để tra cứu vị trí chỗ ngồi.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>

      {searchResult.length > 0 && (
        <div className='text-base'>
          Có {searchResult.length} kết quả tìm kiếm
          <div className='flex flex-col gap-2'>
            {searchResult.map((item) => (
              <div key={item.studentCode} className='mt-4 flex gap-2'>
                <div className='flex-1'>
                  Tên: {item.fullName} | MSSV: {item.studentCode} | Hội trường:{' '}
                  {item.hallName} | Session: {item.sessionNum} | Số ghế:{' '}
                  {item.chair} | Số ghế phụ huynh: {item.chairParent}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
