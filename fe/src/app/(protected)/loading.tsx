import { Skeleton } from '@/components/ui/skeleton';

// Shown inside the persistent layout while the next page streams in, so the sidebar and
// header stay put and the content area responds immediately. It fades in after a short
// delay, so fast navigations never flash a skeleton.
export default function Loading() {
  return (
    <div
      aria-busy='true'
      aria-label='Đang tải'
      className='space-y-6 animate-in fade-in-0 duration-300 [animation-delay:200ms] [animation-fill-mode:backwards] motion-reduce:animate-none'
    >
      <Skeleton className='h-12 w-full rounded-xl' />
      <div className='space-y-4 rounded-xl border border-border/60 bg-card p-6'>
        <Skeleton className='h-6 w-1/3' />
        <div className='grid gap-4 md:grid-cols-2'>
          <Skeleton className='h-10 w-full' />
          <Skeleton className='h-10 w-full' />
        </div>
        <Skeleton className='h-40 w-full' />
      </div>
    </div>
  );
}
