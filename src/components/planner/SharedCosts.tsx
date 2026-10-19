import { useTrip } from '@/lib/planner/store'
import { WHOLE } from '@/lib/planner/types'
import { CostCard } from './CostCard'

export const SHARED_ANCHOR = 'shared-costs'

/** Costs that belong to the trip rather than one day, such as flights and long stays. */
export function SharedCosts() {
  const items = useTrip((s) => s.trip.wholeTrip)
  return (
    <CostCard
      id={WHOLE}
      anchor={SHARED_ANCHOR}
      headingId="shared-costs-heading"
      label="shared costs"
      items={items}
      kinds={['flight', 'stay', 'cab', 'fees', 'food', 'place', 'other']}
      heading={
        <h2 id="shared-costs-heading" className="px-2 text-base font-semibold text-ink">
          Shared costs
        </h2>
      }
      title={<p className="px-2 text-sm text-ink-secondary">For the whole trip rather than one day, like flights.</p>}
    />
  )
}
