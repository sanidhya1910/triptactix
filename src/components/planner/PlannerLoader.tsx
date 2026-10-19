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

// The planner reads localStorage on load, so it is client-only to avoid a hydration mismatch.
const PlannerApp = dynamic(() => import('./PlannerApp'), { ssr: false, loading: PlannerSkeleton })

export default function PlannerLoader() {
  return <PlannerApp />
}
