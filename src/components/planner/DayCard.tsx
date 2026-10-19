import { dayDate, formatINR, sumItems } from '@/lib/planner/calc'
import type { Day } from '@/lib/planner/types'
import { useTrip } from '@/lib/planner/store'
import { AddingHere, DropCard } from './DropCard'
import { ItemList } from './ItemList'
import { AutoTextarea, TrashIcon } from './ui'

export function DayCard({ day, index }: { day: Day; index: number }) {
  const startDate = useTrip((s) => s.trip.startDate)
  const updateDay = useTrip((s) => s.updateDay)
  const requestRemoveDay = useTrip((s) => s.requestRemoveDay)
  const date = dayDate(startDate, index)

  return (
    <DropCard id={day.id} label={`Day ${index + 1}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="font-tp-display text-4xl font-bold uppercase leading-none tracking-wide">Day {index + 1}</h2>
          {date && <span className="text-[17px] font-semibold text-tp-ink2">{date}</span>}
          <AddingHere id={day.id} />
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-sm font-semibold text-tp-ink2">Day total</div>
            <div className="font-tp-display text-4xl font-bold leading-none">{formatINR(sumItems(day.items))}</div>
          </div>
          <button
            onClick={() => requestRemoveDay(day.id)}
            aria-label={`Remove day ${index + 1}`}
            className="flex h-12 w-12 items-center justify-center rounded-lg text-tp-danger hover:bg-tp-surface2"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
      <AutoTextarea
        singleLine
        aria-label={`Day ${index + 1} name`}
        placeholder="Name this day, for example Bangalore to Mysore"
        value={day.title}
        onChange={(title) => updateDay(day.id, { title })}
        className="!text-xl font-bold"
      />
      <AutoTextarea
        aria-label={`Day ${index + 1} notes`}
        placeholder="Write about this day"
        value={day.notes}
        onChange={(notes) => updateDay(day.id, { notes })}
        className="mt-2 mb-4 !text-base"
      />
      <ItemList items={day.items} emptyText="Drag a tile here" />
    </DropCard>
  )
}
