import type { Metadata } from 'next'
import PlannerLoader from '@/components/planner/PlannerLoader'

export const metadata: Metadata = {
  title: 'Trip budget planner',
  description: 'Plan a trip day by day and see every cost add up, in rupees.',
}

export default function PlannerPage() {
  return <PlannerLoader />
}
