import { formatINR, sumItems } from '@/lib/planner/calc'
import { WHOLE } from '@/lib/planner/types'
import { useTrip } from '@/lib/planner/store'
import { AddingHere, DropCard } from './DropCard'
import { ItemList } from './ItemList'

export function WholeTripCard() {
  const items = useTrip((s) => s.trip.wholeTrip)
  return (
    <DropCard id={WHOLE} label="Whole trip">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[26px] font-bold leading-tight">Whole trip</h2>
          <p className="text-base text-tp-ink2">Costs that are not tied to one day, like flights.</p>
        </div>
        <div className="flex items-center gap-3">
          <AddingHere id={WHOLE} />
          <span className="font-tp-display text-4xl font-bold">{formatINR(sumItems(items))}</span>
        </div>
      </div>
      <ItemList items={items} emptyText="Drag a tile here" />
    </DropCard>
  )
}
