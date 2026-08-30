import { cn } from '@/lib/utils';

export default function LoaderData({ isLoading }: { isLoading: boolean }) {
  return (
    <div
      className={cn('h-full w-full flex justify-center items-center', {
        hidden: !isLoading,
      })}
    >
      {isLoading ? (
        <div className='flex-1 flex-col justify-center items-center py-12'>
          <div className='flex justify-center items-center'>
            <div className='loader2 text-center'></div>
          </div>
          <div className='text-lg font-medium text-default-900 text-center mt-2'>
            Đang tải dữ liệu
          </div>
        </div>
      ) : null}
    </div>
  );
}
