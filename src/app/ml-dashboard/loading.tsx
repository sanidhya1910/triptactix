import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/skeleton';

/** Route-level fallback. Shapes mirror the analytics cards, so nothing jumps on hydrate. */
export default function Loading() {
  return (
    <AppShell width="wide">
      <div aria-busy="true">
        <span className="sr-only">Loading</span>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-4 h-5 w-96 max-w-full" />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="mt-8 h-72 w-full" />
      </div>
    </AppShell>
  );
}
