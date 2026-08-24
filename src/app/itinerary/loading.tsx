import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/skeleton';

/** Route-level fallback. Shapes mirror the planner form, so nothing jumps on hydrate. */
export default function Loading() {
  return (
    <AppShell width="wide">
      <div aria-busy="true">
        <span className="sr-only">Loading</span>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-4 h-5 w-96 max-w-full" />
        <Skeleton className="mt-10 h-[32rem] w-full" />
      </div>
    </AppShell>
  );
}
