import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse motion-reduce:animate-none rounded-md bg-default-200/80 dark:bg-default-300/60", className)}
      {...props}
    />
  )
}

export { Skeleton }
