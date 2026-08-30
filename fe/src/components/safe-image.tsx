'use client';
import isValidImageSource from '@/lib/is-valid-image-source';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function SafeImage({
  src,
  alt,
  width,
  height,
  className,
}: {
  src?: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Reset trạng thái khi src thay đổi
  useEffect(() => {
    setIsLoading(true);
    setIsError(false);
  }, [src]);

  // Component hiển thị icon lỗi (dùng chung cho cả trường hợp !valid và onError)
  const ErrorFallback = () => (
    <div
      style={{ width, height }}
      className={`flex flex-col items-center justify-center bg-black text-neutral-500 ${
        className || ''
      }`}
    >
      {/* Icon Broken Image (SVG) */}
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width='24'
        height='24'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
        className='h-1/3 w-1/3 opacity-50' // Kích thước icon bằng 1/3 khung ảnh
      >
        <path d='m21 21-9-9m9 9-9 9 9 9' opacity='0' />{' '}
        {/* Hack để giữ viewbox nếu cần */}
        <path d='M19 19 5 5' />
        <path d='M21 21v-8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2Z' />
        <circle cx='9' cy='9' r='2' />
        <path d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21' />
      </svg>
    </div>
  );

  // 1. Kiểm tra ngay từ đầu
  if (!isValidImageSource(src) || isError) {
    return <ErrorFallback />;
  }

  return (
    <div
      className={`relative overflow-hidden bg-black ${className || ''}`}
      style={{ width, height }} // Wrapper nền đen giữ chỗ
    >
      <Image
        src={src as string}
        alt={alt}
        width={width}
        height={height}
        // Khi đang loading: opacity = 0 (hiện nền đen của wrapper)
        // Khi load xong: opacity = 100 (hiện ảnh)
        className={`transition-opacity duration-200 ease-in-out ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        unoptimized
        onLoad={() => setIsLoading(false)}
        onError={() => setIsError(true)}
      />
    </div>
  );
}
