'use client';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import React from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkinAPI } from '@/config/axios';
import toast from 'react-hot-toast';
import swal from 'sweetalert';
import Html5QrcodePlugin from './components/Html5QrcodePlugin';

export default function Page() {
  const queryClient = useQueryClient();
  const checkinAction = useMutation({
    mutationFn: (data: any) => {
      const nData = {
        studentCode: data,
        status: true,
      };
      console.log(nData);
      return checkinAPI.checkin(nData);
    },

    onError: (error) => {
      toast.error(`Checkin thất bại`, {
        duration: 3000,
        position: 'top-right',
      });
    },
    onSuccess: (data, variables) => {
      console.log('onSuccess', variables);
      toast.success(`Checkin cho ${variables} thành công`, {
        duration: 3000,
        position: 'top-right',
      });
      queryClient.invalidateQueries({ queryKey: ['bachelorList'] });
    },
  });

  const handleCheckin = (data: any) => {
    console.log('data', data);
    swal({
      title: `Checkin`,
      text: `Bạn có muốn checkin cho tân cử nhân ${data} không?`,
      icon: 'warning',
      buttons: ['Không', 'Checkin'],
      dangerMode: true,
    }).then((value) => {
      if (value) {
        checkinAction.mutate(data);
      }
    });
  };

  const onNewScanResult = (decodedText: any, decodedResult: any) => {
    // handle decoded results here
  };
  return (
    <>
      <Card className='animate-fade-up'>
        <CardContent className='p-3'>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href='/'>Trang chủ</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Checkin bằng mã QR</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </CardContent>
      </Card>
      <Card className='mt-3'>
        <CardContent className='p-3 flex items-center justify-center'>
          <div className=' h-[80vw] w-[80vw] md:h-[45vw] md:w-[45vw]'>
            <Scanner
              onError={(error) => {
                console.error(error);
              }}
              onScan={(result) => {
                if (result && result.length > 0)
                  handleCheckin(result[0].rawValue);
              }}
              classNames={{
                container: 'border-2 border-black h-[300px]',
                video: 'h-full',
              }}
            />
            {/* <Html5QrcodePlugin
              fps={10}
              qrbox={250}
              disableFlip={false}
              qrCodeSuccessCallback={onNewScanResult}
            ></Html5QrcodePlugin> */}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
