'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className='min-h-screen flex flex-col justify-center items-center px-4 bg-gradient-to-b from-background to-muted/20'>
      <div className='max-w-2xl mx-auto w-full text-center space-y-8'>
        {/* Image */}
        {/* <div className='flex justify-center'>
          <Image
            src='/assets/images/all-img/404-2.svg'
            alt='Minh họa trang không tìm thấy'
            height={320}
            width={320}
            className='opacity-90'
            priority
          />
        </div> */}

        {/* Content */}
        <div className='space-y-4'>
          <div className='space-y-2'>
            <h1 className='text-6xl font-bold text-default-900 tracking-tight'>
              404
            </h1>
            <h2 className='text-2xl font-semibold text-default-800'>
              Không tìm thấy trang
            </h2>
          </div>

          <p className='text-default-600 text-base leading-relaxed max-w-md mx-auto'>
            Trang bạn đang tìm kiếm có thể đã bị xóa, đổi tên hoặc tạm thời
            không khả dụng. Vui lòng kiểm tra lại đường dẫn hoặc quay về trang
            chủ.
          </p>
        </div>

        {/* Actions */}
        <div className='flex flex-col sm:flex-row gap-3 justify-center items-center pt-4'>
          <Link
            href='/'
            className='inline-flex items-center justify-center px-6 py-3 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-200 shadow-sm min-w-[160px]'
          >
            Về trang chủ
          </Link>
          <button
            onClick={() => window.history.back()}
            className='inline-flex items-center justify-center px-6 py-3 text-sm font-medium rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors duration-200 min-w-[160px]'
          >
            Quay lại
          </button>
        </div>

        {/* Help text */}
        <p className='text-sm text-muted-foreground pt-8'>
          Cần hỗ trợ?{' '}
          <Link
            href='https://www.facebook.com/chals.nit/'
            className='text-primary hover:underline font-medium'
          >
            Liên hệ hỗ trợ
          </Link>
        </p>
      </div>
    </div>
  );
}
