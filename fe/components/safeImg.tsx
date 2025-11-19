'use client';
import isValidImageSrc from '@/utils/isValidImageSrc';
import Image from 'next/image';

export default function SafeImg({
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
  if (!isValidImageSrc(src)) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${
          className || ''
        }`}
      ></div>
    );
  }
  return (
    <Image
      src={src as string}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={(e) => {
        const el = e.currentTarget as HTMLImageElement;
        el.style.display = 'none';
      }}
    />
  );
}
