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
} from '@/components/ui/card';
import { Icon } from '@iconify/react/dist/iconify.js';
import Image from 'next/image';
import React from 'react';

export default function page() {
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
      <Card className='mt-3  justify-center align-middle'>
        <CardContent className='grid grid-cols-3 w-full gap-4 '>
          <Card className='mt-16 shadow-lg'>
            <CardContent>
              <Image
                src='/images/all-img/CONVO_KH_01.png'
                alt='Mô tả hình ảnh'
                className=' object-cover'
                width={1920}
                height={1080}
              />
            </CardContent>
            <CardDescription className='pb-3'>
              <p className='text-center'>Hình ảnh mô tả</p>
              <p className='text-center'>Hình ảnh mô tả</p>
              <p className='text-center'>Hình ảnh mô tả</p>
            </CardDescription>
          </Card>
          <Card className='mt-16 shadow-lg'>
            <CardContent>
              <Image
                src='/images/all-img/CONVO_KH_01.png'
                alt='Mô tả hình ảnh'
                className=' object-cover'
                width={1920}
                height={1080}
              />
            </CardContent>
            <CardDescription className='pb-3'>
              <p className='text-center'>Hình ảnh mô tả</p>
              <p className='text-center'>Hình ảnh mô tả</p>
              <p className='text-center'>Hình ảnh mô tả</p>
            </CardDescription>
          </Card>
          <Card className='mt-16 shadow-lg'>
            <CardContent>
              <Image
                src='/images/all-img/CONVO_KH_01.png'
                alt='Mô tả hình ảnh'
                className=' object-cover'
                width={1920}
                height={1080}
              />
            </CardContent>
            <CardDescription className='pb-3'>
              <p className='text-center'>Hình ảnh mô tả</p>
              <p className='text-center'>Hình ảnh mô tả</p>
              <p className='text-center'>Hình ảnh mô tả</p>
            </CardDescription>
          </Card>
        </CardContent>
        <CardFooter className='flex justify-center align-middle mt-5 rounded-tr-none rounded-br-none pb-10'>
          <Button variant={'outline'}>
            <Icon icon='fluent:arrow-previous-12-filled' className='w-5 h-5' />
          </Button>
          <Button variant={'outline'} disabled className='rounded-none'>
            SE160020
          </Button>
          <Button variant={'outline'}>
            <Icon icon='fluent:arrow-next-12-filled' className='w-5 h-5' />
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}
