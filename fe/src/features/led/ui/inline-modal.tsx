'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

/**
 * Khung nổi nằm ngay trong cây giao diện, không dùng portal ra `body`.
 * Lý do: khi một phần tử vào toàn màn hình, trình duyệt chỉ hiện phần tử đó, nên hộp thoại portal sẽ bị ẩn.
 */
export function InlineModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role='dialog'
        aria-modal='true'
        aria-label={title}
        className='flex max-h-[85vh] w-full max-w-2xl flex-col gap-4 rounded-xl border-2 border-orange-300 bg-white p-5 shadow-2xl dark:border-orange-700 dark:bg-slate-900'
      >
        <div className='flex items-center justify-between gap-3'>
          <h2 className='text-xl font-bold text-orange-900 dark:text-orange-100'>{title}</h2>
          <button
            type='button'
            onClick={onClose}
            aria-label='Đóng'
            className='rounded-md p-1.5 text-muted-foreground hover:bg-muted'
          >
            <X className='h-5 w-5' aria-hidden='true' />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
