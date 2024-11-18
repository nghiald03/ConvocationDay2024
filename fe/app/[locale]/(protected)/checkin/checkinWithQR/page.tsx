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

export default function Page() {
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
        <CardContent className='pt-3 flex items-center justify-center'>
          <div className=' h-[80vw] w-[80vw] md:h-[45vw] md:w-[45vw]'>
            <Scanner
              onScan={(result) => console.log(result)}
              classNames={{
                container: 'border-2 border-black h-[300px]',
                video: 'h-full',
              }}
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
