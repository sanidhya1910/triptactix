'use client'

import dynamic from 'next/dynamic'
import { AppShell } from '@/components/layout/AppShell'
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton'

/** Same frame as the loaded page, so the navbar and layout do not jump when it arrives. */
function PlannerSkeleton() {
  return (
    <AppShell width="wide">
      <div aria-busy="true" aria-label="Loading the budget planner">
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="mt-4 h-5 w-96 max-w-full" />
        <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
          <div className="space-y-5">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <SkeletonCard className="hidden lg:block" />
        </div>
      </div>
    </AppShell>
  )
}

/**
 * next/dynamic hands a failed import to `loading` as `error`. Ignoring it would leave a
 * crash looking exactly like an endless load, so say what happened and offer a retry.
 */
function PlannerLoading({ error }: { error?: Error | null }) {
  if (!error) return <PlannerSkeleton />
  return (
    <AppShell width="narrow">
      <div role="alert" className="py-12">
        <h1 className="text-display-sm text-ink">The budget planner didn’t load.</h1>
        <p className="mt-4 text-ink-secondary prose-measure">
          Reloading usually fixes this. Your budgets are saved on this device and are not affected.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-8 inline-flex h-10 items-center rounded-md bg-ink px-5 text-sm font-medium text-surface hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          Reload
        </button>
        <p className="mt-10 font-mono text-xs text-ink-tertiary">{error.message}</p>
      </div>
    </AppShell>
  )
}

/**
 * Client-only: the planner reads localStorage, and the ?trip= id is read inside it with
 * useSearchParams. Because this component never renders on the server, that needs no
 * Suspense boundary of its own; wrapping it in one made Next bail out to client rendering
 * at that outer boundary, which then waited on this lazy import.
 */
const PlannerRoute = dynamic(() => import('./PlannerApp'), { ssr: false, loading: PlannerLoading })

export default function PlannerLoader() {
  return <PlannerRoute />
}
