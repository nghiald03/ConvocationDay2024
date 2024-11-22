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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import toast from 'react-hot-toast';
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
import { Label } from '@/components/ui/label';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ledAPI, manageAPI } from '@/config/axios';
import { Bachelor } from '@/dtos/BachelorDTO';

const formSchema = z.object({
  fullName: z.string({ message: 'Họ và tên không được để trống' }),
  studentCode: z.string({ message: 'Mã số sinh viên không được để trống' }),
  mail: z.string({ message: 'Mail không được để trống' }),
  chair: z.string({ message: 'Số ghế không được để trống' }),
  chairParent: z.string({
    message: 'Số ghế của phụ huynh không được để trống',
  }),
  hallName: z.string({ message: 'Hội trường không được để trống' }),
  sessionNum: z.string({ message: 'Phiên trao bằng không được để trống' }),
  image: z.string({ message: 'Image không được để trống' }),
  major: z.string({ message: 'Chuyên ngành không được để trống' }),
});

type ComponentProps = {
  children?: React.ReactNode;
  hallList?: Array<any>;
  sessionList?: Array<any>;
  bachelor?: any;
};

export default function AddOrUpdateBachelor({
  children,
  hallList,
  sessionList,
  bachelor,
}: ComponentProps) {
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  type AddBachelorFromFileProps = {
    data: Bachelor[];
  };

  const addBachelorFromFile = useMutation({
    mutationFn: ({ data }: AddBachelorFromFileProps) => {
      const dataUpload = data.map((item) => {
        return {
          studentCode: item.studentCode,
          fullName: item.fullName,
          mail: item.mail,
          major: item.major,
          image: item.image,
          hallName: item.hallName,
          sessionNum: item.sessionNum,
          chair: item.chair.toString(),
          chairParent: item.chairParent.toString(),
        };
      });
      return manageAPI.addBachelor(dataUpload);
    },
    onSuccess: () => {
      toast.success('Thêm thành công', {
        duration: 5000,
        position: 'top-right',
      });

      queryClient.invalidateQueries({ queryKey: ['bachelorList'] });
    },
    onError: (error: any) => {
      toast.error('Thêm thất bại' + error.respone.data, {
        duration: 3000,
        position: 'top-right',
      });
      console.log('Error:', error);
    },
  });

  const updateBachelor = useMutation({
    mutationFn: (values: Bachelor) => {
      const dataUpload: Bachelor = {
        studentCode: values.studentCode,
        fullName: values.fullName,
        mail: values.mail,
        major: values.major,
        image: values.image,
        hallName: values.hallName,
        sessionNum: values.sessionNum,
        chair: values.chair.toString(),
        chairParent: values.chairParent.toString(),
      };
      return manageAPI.updateBachelor(dataUpload);
    },
    onSuccess: () => {
      toast.success('Cập nhật thành công', {
        duration: 5000,
        position: 'top-right',
      });
      queryClient.invalidateQueries({ queryKey: ['bachelorList'] });
    },
    onError: (error: any) => {
      toast.error('Cập nhật thất bại' + error.respone.data, {
        duration: 3000,
        position: 'top-right',
      });
      console.log('Error:', error);
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (bachelor) {
        updateBachelor.mutate({
          studentCode: values.studentCode,
          fullName: values.fullName,
          mail: values.mail,
          major: values.major,
          image: values.image,
          hallName: values.hallName,
          sessionNum: values.sessionNum,
          chair: values.chair,
          chairParent: values.chairParent,
        });
      } else {
        manageAPI.addBachelor([
          {
            studentCode: values.studentCode,
            fullName: values.fullName,
            mail: values.mail,
            major: values.major,
            image: values.image,
            hallName: values.hallName,
            sessionNum: values.sessionNum,
            chair: values.chair,
            chairParent: values.chairParent,
          },
        ]);
      }
    } catch (error) {
      console.error('Form submission error', error);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>
            {bachelor
              ? 'Thay đổi thông tin tân cử nhân'
              : 'Thêm mới một tân cử nhân'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-3 max-w-3xl mx-auto '
          >
            <FormField
              control={form.control}
              name='fullName'
              defaultValue={bachelor?.fullName}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Họ và tên</FormLabel>
                  <FormControl>
                    <Input placeholder='' type='text' {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='image'
              defaultValue={bachelor?.image}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image</FormLabel>
                  <FormControl>
                    <Input placeholder='' {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='major'
              defaultValue={bachelor?.major}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chuyên ngành</FormLabel>
                  <FormControl>
                    <Input placeholder='' {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='grid grid-cols-12 gap-4'>
              <div className='col-span-6'>
                <FormField
                  control={form.control}
                  name='studentCode'
                  defaultValue={bachelor?.studentCode}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mã số sinh viên</FormLabel>
                      <FormControl>
                        <Input placeholder='' type='' {...field} />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className='col-span-6'>
                <FormField
                  control={form.control}
                  name='mail'
                  defaultValue={bachelor?.mail}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mail</FormLabel>
                      <FormControl>
                        <Input placeholder='' type='email' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className='grid grid-cols-12 gap-4'>
              <div className='col-span-6'>
                <FormField
                  control={form.control}
                  name='hallName'
                  defaultValue={bachelor?.hallName}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hội trường</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={bachelor?.hallName}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {hallList &&
                            Array.isArray(hallList) &&
                            hallList.length > 0 &&
                            hallList.map((hall) => (
                              <SelectItem
                                key={hall.hallId}
                                value={hall.hallName}
                              >
                                {hall.hallName}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className='col-span-6'>
                <FormField
                  control={form.control}
                  name='sessionNum'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phiên trao bằng</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={bachelor?.sessionNum.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent position={'item-aligned'}>
                          {sessionList &&
                            Array.isArray(sessionList) &&
                            sessionList.length > 0 &&
                            sessionList.map((session) => (
                              <SelectItem
                                key={session.sessionId}
                                value={session.session1.toString()}
                              >
                                {session.session1}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className='grid grid-cols-12 gap-4'>
              <div className='col-span-6'>
                <FormField
                  control={form.control}
                  name='chair'
                  defaultValue={bachelor?.chair}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số ghế</FormLabel>
                      <FormControl>
                        <Input placeholder='' type='text' {...field} />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className='col-span-6'>
                <FormField
                  control={form.control}
                  name='chairParent'
                  defaultValue={bachelor?.chairParent}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số ghế của phụ huynh</FormLabel>
                      <FormControl>
                        <Input placeholder='' type='text' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <DialogClose>
                <Button color='secondary' type='reset'>
                  Hủy
                </Button>
              </DialogClose>
              <Button
                type='submit'
                disabled={
                  addBachelorFromFile.isPending || updateBachelor.isPending
                }
                color='primary'
              >
                {addBachelorFromFile.isPending || updateBachelor.isPending
                  ? 'Loading...'
                  : bachelor
                  ? 'Lưu thay đổi'
                  : 'Thêm mới'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
