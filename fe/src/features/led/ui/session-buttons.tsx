'use client';

import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { sessionQueryOptions } from '@/features/session/queries/session-query-options';

/**
 * Chọn phiên bằng một hàng nút thay cho dropdown. Dropdown (Radix Select) bật danh sách ra lớp nổi, và browser source
 * của OBS không hiện lớp đó nên không chọn được; nút bấm nằm ngay trên trang nên dùng được ở mọi nơi.
 */
export function SessionButtons({
  value,
  onChange,
  labelledBy,
  extraOption,
}: {
  /** sessionId dạng chuỗi; '' là chưa chọn. */
  value: string;
  onChange: (value: string) => void;
  labelledBy?: string;
  /** Nút thêm ở đầu, ví dụ "Tự động". */
  extraOption?: { value: string; label: string };
}) {
  const { data: sessions = [], isLoading } = useQuery(sessionQueryOptions);
  const options = [
    ...(extraOption ? [extraOption] : []),
    ...sessions.map((session) => ({
      value: String(session.sessionId),
      label: `Phiên ${session.session1 ?? session.sessionId}${session.description ? ` · ${session.description}` : ''}`,
    })),
  ];

  if (isLoading && !extraOption) {
    return <p className='text-sm text-muted-foreground'>Đang tải danh sách phiên…</p>;
  }
  return (
    <div role='radiogroup' aria-labelledby={labelledBy} className='flex flex-wrap gap-2'>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type='button'
            role='radio'
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-11 min-w-[5.5rem] rounded-md border-2 px-4 text-sm font-semibold tabular-nums transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2',
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-default-200 bg-background text-default-700 hover:border-orange-400',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Đọc tham số trên URL (ví dụ `?session=8`) để cấu hình sẵn màn hình cho OBS mà không cần bấm. */
export function readUrlParam(name: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}
