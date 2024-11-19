'use client';
import { useState } from 'react';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';
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
import { useMutation } from '@tanstack/react-query';
import { checkinAPI } from '@/config/axios';
import toast from 'react-hot-toast';
import { Bachelor } from '@/dtos/BachelorDTO';

const formSchema = z.object({
  seatLocation: z.string(),
});

export default function FormSearchLocation() {
  const [searchResult, setSearchResult] = useState<Bachelor[]>([]);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const searchLocation = useMutation({
    mutationFn: (data: any) => {
      return checkinAPI.getLocation(data);
    },
    onError: (error, variables, context) => {
      console.log(error);
      toast.error(`Không tìm thấy chỗ ngồi của tân cử nhân ${variables}`, {
        duration: 3000,
        position: 'top-right',
      });
    },
    onSuccess: (data, variables) => {
      console.log(data.data.data.items);
      toast.success(
        `Tìm thấy ${data.data.data.items.length} kết quả cho ${variables}`,
        {
          duration: 3000,
          position: 'top-right',
        }
      );
      if (data.data.data.items && data.data.data.items.length > 0) {
        setSearchResult(data.data.data.items);
      }
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    searchLocation.mutate(values.seatLocation);
  }

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-8  pt-3 w-full'
        >
          <FormField
            control={form.control}
            name='seatLocation'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tìm kiếm theo tên tân cử nhân hoặc MSSV</FormLabel>
                <FormControl>
                  <div className='flex gap-2'>
                    <Input
                      placeholder=''
                      type=''
                      {...field}
                      className='w-full flex-1 h-full'
                    />
                    <Button type='submit' color='primary'>
                      Tìm kiếm
                    </Button>
                  </div>
                </FormControl>
                <FormDescription>
                  Bạn nhập tên hoặc MSSV của tân cử nhân sau đó bấm vào nút tìm
                  kiếm để tra cứu chỗ ngồi cho tân cử nhân
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
      {searchResult.length > 0 && (
        <>
          <div className='text-base'>
            Có {searchResult.length} kết quả tìm kiếm
            <br />
            <div className='flex flex-col gap-2'>
              {searchResult.map((item, index) => (
                <div key={index} className='flex gap-2 mt-4'>
                  <div className='flex-1'>
                    Tên: {item.fullName} | MSSV: {item.studentCode} | Hội
                    Trường: {item.hallName} | Session: {item.sessionNum} | Số
                    ghế: {item.chair} | Số ghế phụ huynh: {item.chairParent}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
