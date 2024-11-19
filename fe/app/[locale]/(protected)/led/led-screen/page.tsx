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
import { Card, CardContent } from '@/components/ui/card';
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
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ledAPI } from '@/config/axios';
import { Bachelor } from '@/dtos/BachelorDTO';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { HubConnectionBuilder } from '@microsoft/signalr';

export default function LedScreen() {
  const [hall, setHall] = useState('');
  const [session, setSession] = useState('');
  const [hallList, setHallList] = useState([{ value: '', label: '' }]);
  const [sessionList, setSessionList] = useState([{ value: '', label: '' }]);

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
    console.log('hallx', hall);
    console.log('sessionx', session);
    if (session) {
      setSession(session);
    }
    if (hall) {
      setHall(hall);
    }
  }, []);

  useEffect(() => {
    console.log('hall', hall);
    window.localStorage.setItem('hall', hall);
  }, [hall]);

  useEffect(() => {
    console.log('session', session);
    window.localStorage.setItem('session', session);
  }, [session]);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleDoubleClick = () => {
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl('http://34.50.64.42:85/chat-hub')
      .withAutomaticReconnect()
      .build();

    const parseMessage = (message: string) => {
      const keyValuePairs: { [key: string]: any } = {};

      message
        .replace('CurrentBachelor ', '') // Loại bỏ phần không cần thiết
        .split(', ') // Tách từng cặp key-value
        .forEach((pair) => {
          const [key, ...valueParts] = pair.split(':'); // Tách key và value qua dấu ':'
          const value = valueParts.join(':').trim(); // Gộp lại phần value nếu có dấu ':'

          // Xử lý kiểu dữ liệu
          if (value === 'True') keyValuePairs[key] = true;
          else if (value === 'False') keyValuePairs[key] = false;
          else if (value === 'null' || value === '') keyValuePairs[key] = null;
          else if (!isNaN(Number(value)))
            keyValuePairs[key] = Number(value); // Chuyển số
          else keyValuePairs[key] = value.trim(); // Chuỗi thông thường
        });

      return keyValuePairs;
    };

    async function startSignalRConnection() {
      try {
        await connection.start();
        console.log('SignalR connection started.');

        connection.on('SendMessage', (message: string) => {
          try {
            console.log('Raw message:', message);
            const parsedData = parseMessage(message);
            console.log('Parsed message:', parsedData);

            const bachelorData: Bachelor = {
              image: parsedData['Image'],
              fullName: parsedData['FullName'],
              major: parsedData['Major'],
              studentCode: parsedData['StudentCode'],
              mail: parsedData['Mail'],
              hallName: parsedData['HallName'],
              sessionNum: parsedData['SessionNum'],
              chair: parsedData['Chair'],
              chairParent: parsedData['ChairParent'],
            };

            console.log('Bachelor data:', bachelorData);
          } catch (error) {
            console.error('Error processing message:', error);
          }
        });
      } catch (error) {
        console.error('Error starting SignalR connection:', error);
      }
    }

    startSignalRConnection();

    return () => {
      connection.stop();
    };
  }, []);

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
                <BreadcrumbPage>Trình chiếu LED </BreadcrumbPage>
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
                <AlertDescription>
                  <Icon icon='akar-icons:double-check' className='w-5 h-5' />{' '}
                  Cài đặt hall và session bằng cách click tại đây [ hall:{' '}
                  {hallList.map((item) => {
                    if (item.value === hall) {
                      return item.label;
                    }
                  })}{' '}
                  và session:{' '}
                  {sessionList.map((item) => {
                    if (item.value === session) {
                      return item.label;
                    }
                  })}{' '}
                  ]
                </AlertDescription>
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
                    <SelectContent>
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
                    <SelectContent>
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

          <Alert variant='soft' color='primary' className='mt-3'>
            <AlertDescription>
              <Icon icon='gridicons:fullscreen' className='w-5 h-5' /> Để vào
              chế độ fullscreen, hãy double-click vào hình ảnh bên dưới !
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
      {isFullscreen ? (
        <div
          className='absolute inset-0 z-[999999999] bg-black flex items-center justify-center'
          onDoubleClick={handleDoubleClick} // Thoát fullscreen khi double-click
        >
          <Card className='w-[100vw] h-[100vh]'>
            <CardContent className='p-0 w-[100vw] h-[100vh]'>
              <Image
                src='/images/all-img/CONVO_KH_01.png'
                alt='Mô tả hình ảnh'
                className='w-full h-full object-cover'
                width={1920}
                height={1080}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        // Card bình thường
        <Card
          className='mt-3 animate-fade-up animate-duration-1000'
          onDoubleClick={handleDoubleClick} // Bật fullscreen khi double-click
        >
          <CardContent className='p-3'>
            <Image
              src='/images/all-img/CONVO_KH_01.png'
              alt='Mô tả hình ảnh'
              className='w-full h-full object-cover'
              width={1920}
              height={1080}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}
