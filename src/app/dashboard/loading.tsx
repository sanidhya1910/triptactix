import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/skeleton';

/** Route-level fallback. Shapes mirror the stat row, tabs and trip grid, so nothing jumps on hydrate. */
export default function Loading() {
  return (
    <AppShell width="default">
      <div aria-busy="true">
        <span className="sr-only">Loading</span>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-4 h-5 w-96 max-w-full" />
        <div className="mt-14 grid grid-cols-2 gap-8 border-y border-line py-10 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-12 h-11 w-80" />
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
