'use client';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  CardDescription,
  CardFooter,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ledAPI } from '@/config/axios';
import { Bachelor } from '@/dtos/BachelorDTO';
import { th } from '@faker-js/faker';
import { Icon } from '@iconify/react/dist/iconify.js';
import { useMutation, useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import React, { use, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export default function Page() {
  const [hall, setHall] = useState(
    () => window.localStorage.getItem('hall') || ''
  );
  const [session, setSession] = useState(
    () => window.localStorage.getItem('session') || ''
  );
  const [hallList, setHallList] = useState([{ value: '', label: '' }]);
  const [sessionList, setSessionList] = useState([{ value: '', label: '' }]);
  const [bachelorCurrent, setBachelorCurrent] = useState<Bachelor | null>(null);
  const [bachelorBack, setBachelorBack] = useState<Bachelor | null>();
  const [bachelorNext, setBachelorNext] = useState<Bachelor | null>();

  const { data: hallData, error: hallError } = useQuery({
    queryKey: ['listHall'],
    queryFn: () => {
      return ledAPI
        .getHallList()
        .then((res) => res.data)
        .catch((err) => {
          throw err;
        });
    },
  });

  useEffect(() => {
    if (hallData && hallData.data.length > 0) {
      setHallList(
        hallData.data.map((item: any) => ({
          value: item.hallId,
          label: item.hallName,
        }))
      );
    }
  }, [hallData]);

  const { data: sessionData, error: sessionError } = useQuery({
    queryKey: ['listSession'],
    queryFn: () => {
      return ledAPI
        .getSessionList()
        .then((res) => res.data)
        .catch((err) => {
          throw err;
        });
    },
  });

  useEffect(() => {
    if (sessionData && sessionData.data.length > 0) {
      setSessionList(
        sessionData.data.map((item: any) => ({
          value: item.sessionId,
          label: item.session1,
        }))
      );
    }
  }, [sessionData]);

  useEffect(() => {
    const hall = window.localStorage.getItem('hall');
    const session = window.localStorage.getItem('session');

    if (session) {
      setSession(session);
    }
    if (hall) {
      setHall(hall);
    }
  }, []);

  useEffect(() => {
    if (!hall) {
      return;
    }
    window.localStorage.setItem('hall', hall);
  }, [hall]);

  useEffect(() => {
    if (!session) {
      return;
    }
    window.localStorage.setItem('session', session);
  }, [session]);

  const hallLabel = useMemo(() => {
    return (
      hallList.find((item) => item.value.toString() === hall.toString())
        ?.label || 'Chưa chọn'
    );
  }, [hallList, hall]);

  const sessionLabel = useMemo(() => {
    return (
      sessionList.find((item) => item.value.toString() === session.toString())
        ?.label || 'Chưa chọn'
    );
  }, [sessionList, session]);

  const getBachelorCurrent = useMutation({
    mutationFn: async () => {
      if (!hall || !session) {
        throw new Error('Chưa chọn hall hoặc session');
      }
      return ledAPI.getBachelorCurrent(hall, session);
    },
    onSuccess: (data) => {
      console.log('BachelorCurrent', data);
      if (data?.data?.data) {
        console.log('bachelorBack', data.data.data.bachelor1);
        console.log('bachelorCurrent', data.data.data.bachelor2);
        console.log('bachelorNext', data.data.data.bachelor3);
        if (data.data.data.bachelor1 !== '') {
          setBachelorBack(data.data.data.bachelor1);
        } else {
          setBachelorBack(null);
        }
        if (data.data.data.bachelor2) {
          setBachelorCurrent(data.data.data.bachelor2);
        }
        if (data.data.data.bachelor3 !== '') {
          setBachelorNext(data.data.data.bachelor3);
        } else {
          setBachelorNext(null);
        }
      }
      // setBachelorCurrent(data.data);
    },
    onError: (error) => {
      toast.error(
        'Có lỗi khi lấy dữ liệu vui lòng chọn hall và session khác!',
        {
          duration: 3000,
          position: 'top-right',
        }
      );
      console.log('Error:', error);
    },
  });

  const getBachelor1st = useMutation({
    mutationFn: async () => {
      if (!hall || !session) {
        throw new Error('Chưa chọn hall hoặc session');
      }
      return ledAPI.getBachelor1st(hall, session);
    },
    onSuccess: () => {
      getBachelorCurrent.mutate();

      // setBachelorCurrent(data.data);
    },
    onError: (error) => {
      toast.error(
        'Có lỗi khi lấy dữ liệu vui lòng chọn hall và session khác!',
        {
          duration: 3000,
          position: 'top-right',
        }
      );
      setBachelorCurrent(null);
      setBachelorBack(null);
      setBachelorNext(null);
      console.log('Error:', error);
    },
  });

  const getBachelorNext = useMutation({
    mutationFn: async () => {
      if (!hall || !session) {
        throw new Error('Chưa chọn hall hoặc session');
      }
      return ledAPI.getBachelorNext(hall, session);
    },
    onSuccess: () => {
      getBachelorCurrent.mutate();

      // setBachelorCurrent(data.data);
    },
    onError: (error) => {
      toast.error('Lỗi khi lấy dữ liệu', {
        duration: 3000,
        position: 'top-right',
      });
      console.log('Error:', error);
    },
  });

  const getBachelorBack = useMutation({
    mutationFn: async () => {
      if (!hall || !session) {
        throw new Error('Chưa chọn hall hoặc session');
      }
      return ledAPI.getBachelorBack(hall, session);
    },
    onSuccess: () => {
      getBachelorCurrent.mutate();

      // setBachelorCurrent(data.data);
    },
    onError: (error) => {
      toast.error('Lỗi khi lấy dữ liệu', {
        duration: 3000,
        position: 'top-right',
      });
      console.log('Error:', error);
    },
  });

  useEffect(() => {
    if (!hall || !session) {
      toast.error('Chưa chọn hall hoặc session', {
        duration: 3000,
        position: 'top-right',
      });
      return;
    }
    getBachelor1st.mutate();
  }, [hall, session]);
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
                <BreadcrumbPage>Điều khiển cho MC</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </CardContent>
      </Card>

      <Card className='mt-3'>
        <CardContent className='p-3'>
          <Alert variant='soft' color='primary'>
            <AlertDescription>
              <Icon icon='heroicons-outline:support' className='w-5 h-5' /> Nếu
              bạn cần hỗ trợ, vui lòng liên hệ với ADMIN để được hỗ trợ.
            </AlertDescription>
          </Alert>
          <Dialog>
            <DialogTrigger asChild>
              <Alert variant='soft' color='success' className='mt-3'>
                <AlertDescription key={hall + session}>
                  <Icon icon='akar-icons:double-check' className='w-5 h-5' />{' '}
                  Cài đặt hall và session bằng cách click tại đây [ hall:{' '}
                  {hallLabel} và session: {sessionLabel} ]
                </AlertDescription>
                ;
              </Alert>
            </DialogTrigger>
            <DialogContent className='sm:max-w-[425px]'>
              <DialogHeader>
                <DialogTitle>Cài đặt hall và session</DialogTitle>
                <DialogDescription>
                  Chọn hall và session để trình chiếu LED rồi bấm lưu
                </DialogDescription>
              </DialogHeader>
              <div className='grid gap-4 py-4'>
                <div className='flex w-full items-center gap-4'>
                  <Select onValueChange={setHall} value={hall}>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Chọn Hall' />
                    </SelectTrigger>
                    <SelectContent position='item-aligned'>
                      {hallList &&
                        hallList.length > 0 &&
                        hallList.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='flex w-full items-center gap-4'>
                  <Select onValueChange={setSession} value={session}>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Chọn session' />
                    </SelectTrigger>
                    <SelectContent position='item-aligned'>
                      {sessionList &&
                        sessionList.length > 0 &&
                        sessionList.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose>
                  <Button>Lưu</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
      {hall && session && (
        <Card className='mt-3  justify-center align-middle animate-fade-up'>
          <CardContent className='grid grid-cols-3 w-full gap-4 '>
            {bachelorBack ? (
              <Card className='mt-16 shadow-lg'>
                <CardTitle className='mb-1'>
                  <h2 className='text-center text-base'>Tân cử nhân trước</h2>
                </CardTitle>
                <CardContent>
                  {bachelorBack.image && (
                    <Image
                      src={bachelorBack.image}
                      alt='Mô tả hình ảnh'
                      className=' object-cover'
                      width={1920}
                      height={1080}
                    />
                  )}
                </CardContent>
                <CardDescription className='pb-3'>
                  <p className='text-center font-bold text-lg'>
                    {bachelorBack.fullName}
                  </p>
                  <p className='text-center font-bold text-lg'>
                    {bachelorBack.studentCode}
                  </p>
                  <p className='text-center font-bold text-lg'>
                    {bachelorBack.major}
                  </p>
                </CardDescription>
              </Card>
            ) : (
              <Card className='mt-16 shadow-lg'>
                <CardTitle className='mb-1'>
                  <h2 className='text-center text-base'>Tân cử nhân trước</h2>
                </CardTitle>
                <CardContent className='h-full w-full flex items-center justify-center'>
                  <Icon icon='ph:empty-bold' className='w-10 h-10'></Icon>
                  Không tồn tại
                </CardContent>
              </Card>
            )}
            {bachelorCurrent ? (
              <Card className='mt-16 shadow-lg'>
                <CardTitle className='mb-1'>
                  <h2 className='text-center text-base'>
                    Tân cử nhân hiện tại
                  </h2>
                </CardTitle>
                <CardContent>
                  {bachelorCurrent.image && (
                    <Image
                      src={bachelorCurrent.image}
                      alt='Mô tả hình ảnh'
                      className=' object-cover'
                      width={1920}
                      height={1080}
                    />
                  )}
                </CardContent>
                <CardDescription className='pb-3'>
                  <p className='text-center font-bold text-lg'>
                    {bachelorCurrent.fullName}
                  </p>
                  <p className='text-center font-bold text-lg'>
                    {bachelorCurrent.studentCode}
                  </p>
                  <p className='text-center font-bold text-lg'>
                    {bachelorCurrent.major}
                  </p>
                </CardDescription>
              </Card>
            ) : (
              <Card className='mt-16 shadow-lg'>
                <CardTitle className='mb-1'>
                  <h2 className='text-center text-base'>
                    Tân cử nhân hiện tại
                  </h2>
                </CardTitle>
                <CardContent className='h-full w-full flex items-center justify-center'>
                  <Icon icon='ph:empty-bold' className='w-10 h-10'></Icon>
                  Không tồn tại
                </CardContent>
              </Card>
            )}
            {bachelorNext ? (
              <Card className='mt-16 shadow-lg'>
                <CardTitle className='mb-1'>
                  <h2 className='text-center text-base'>Tân cử nhân sau</h2>
                </CardTitle>
                <CardContent>
                  {bachelorNext.image && (
                    <Image
                      src={bachelorNext.image}
                      alt='Mô tả hình ảnh'
                      className=' object-cover'
                      width={1920}
                      height={1080}
                    />
                  )}
                </CardContent>
                <CardDescription className='pb-3'>
                  <p className='text-center font-bold text-lg'>
                    {bachelorNext.fullName}
                  </p>
                  <p className='text-center font-bold text-lg'>
                    {bachelorNext.studentCode}
                  </p>
                  <p className='text-center font-bold text-lg'>
                    {bachelorNext.major}
                  </p>
                </CardDescription>
              </Card>
            ) : (
              <Card className='mt-16 shadow-lg'>
                <CardTitle className='mb-1'>
                  <h2 className='text-center text-base'>Tân cử nhân sau</h2>
                </CardTitle>
                <CardContent className='h-full w-full flex items-center justify-center'>
                  <Icon icon='ph:empty-bold' className='w-10 h-10'></Icon>
                  Không tồn tại
                </CardContent>
              </Card>
            )}
          </CardContent>
          <CardFooter className='flex justify-center align-middle mt-5 rounded-tr-none rounded-br-none pb-10'>
            <Button
              variant={'outline'}
              disabled={!bachelorBack}
              onClick={() => {
                getBachelorBack.mutate();
              }}
              color='primary'
            >
              <Icon
                icon='fluent:arrow-previous-12-filled'
                className='w-5 h-5'
              />
            </Button>
            <Button
              variant={'outline'}
              disabled
              color='primary'
              className='rounded-none'
            >
              {bachelorCurrent
                ? bachelorCurrent.fullName + ' ' + bachelorCurrent.studentCode
                : 'Không tồn tại'}
            </Button>
            <Button
              variant={'outline'}
              onClick={() => {
                getBachelorNext.mutate();
              }}
              disabled={!bachelorNext}
              color='primary'
            >
              <Icon icon='fluent:arrow-next-12-filled' className='w-5 h-5' />
            </Button>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
