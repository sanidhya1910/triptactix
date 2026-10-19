'use client'

import dynamic from 'next/dynamic'

// The planner reads localStorage on load, so it is client-only to avoid a hydration mismatch.
const PlannerApp = dynamic(() => import('./PlannerApp'), {
  ssr: false,
  loading: () => <div className="min-h-[100dvh]" aria-busy="true" />,
})

export default function PlannerLoader() {
  return <PlannerApp />
}
