import { cn } from '@/lib/utils';

/** Shapes match the layout they stand in for. Never a centered spinner. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-surface-sunken', className)}
      {...props}
    />
  );
}

/** Result-row placeholder used by search and the ML dashboard. */
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border border-line bg-surface p-6', className)}>
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-6 w-3/5" />
          <Skeleton className="h-4 w-2/5" />
        </div>
        <div className="space-y-3 text-right">
          <Skeleton className="ml-auto h-7 w-24" />
          <Skeleton className="ml-auto h-9 w-28" />
        </div>
      </div>
    </div>
  );
}

export { Skeleton, SkeletonCard };
