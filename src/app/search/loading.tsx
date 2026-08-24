import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/skeleton';

/** Route-level fallback. Shapes mirror the search form and result rows, so nothing jumps on hydrate. */
export default function Loading() {
  return (
    <AppShell width="wide">
      <div aria-busy="true">
        <span className="sr-only">Loading</span>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-4 h-5 w-96 max-w-full" />
        <Skeleton className="mt-10 h-80 w-full" />
        <div className="mt-14 space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
