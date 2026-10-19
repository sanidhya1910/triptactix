import { useState } from 'react'
import { NotePencil, Trash } from '@phosphor-icons/react/ssr'
import { dayDate } from '@/lib/planner/calc'
import type { Day } from '@/lib/planner/types'
import { useTrip } from '@/lib/planner/store'
import { cn } from '@/lib/utils'
import { CostCard } from './CostCard'
import { AutoTextarea, InlineInput, focusSoon, iconButton } from './ui'

export const dayAnchor = (id: string) => `day-${id}`
export const dayTitleId = (id: string) => `day-${id}-title`

export function DayCard({ day, index }: { day: Day; index: number }) {
  const startDate = useTrip((s) => s.trip.startDate)
  const updateDay = useTrip((s) => s.updateDay)
  const requestRemoveDay = useTrip((s) => s.requestRemoveDay)
  const [notesOpen, setNotesOpen] = useState(day.notes !== '')

  const n = index + 1
  const date = dayDate(startDate, index)
  const headingId = `day-${day.id}-heading`
  const notesId = `day-${day.id}-notes`

  return (
    <CostCard
      id={day.id}
      anchor={dayAnchor(day.id)}
      headingId={headingId}
      label={`Day ${n}`}
      items={day.items}
      heading={
        <h2 id={headingId} className="flex items-baseline gap-2 px-2 text-xs font-medium text-ink-tertiary">
          <span className="text-ink-secondary">Day {n}</span>
          {date && <span>{date}</span>}
        </h2>
      }
      title={
        <InlineInput
          id={dayTitleId(day.id)}
          aria-label={`Day ${n} name`}
          placeholder="Name this day, for example Bengaluru to Mysuru"
          value={day.title}
          onChange={(e) => updateDay(day.id, { title: e.target.value })}
          className="mt-0.5 h-9 text-base font-semibold"
        />
      }
      actions={
        <>
          {!notesOpen && (
            <button
              type="button"
              onClick={() => {
                setNotesOpen(true)
                focusSoon(notesId)
              }}
              aria-label={`Add notes to day ${n}`}
              className={iconButton}
            >
              <NotePencil className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => requestRemoveDay(day.id)}
            aria-label={`Remove day ${n}`}
            className={cn(iconButton, 'hover:bg-neg hover:text-neg-fg')}
          >
            <Trash className="h-4 w-4" />
          </button>
        </>
      }
    >
      {notesOpen && (
        <div className="border-b border-line px-3 py-2 sm:px-4">
          <AutoTextarea
            id={notesId}
            aria-label={`Day ${n} notes`}
            placeholder="Notes for this day: timings, bookings, reminders"
            value={day.notes}
            onChange={(notes) => updateDay(day.id, { notes })}
            onBlur={() => day.notes.trim() === '' && setNotesOpen(false)}
            className="text-ink-secondary"
          />
        </div>
      )}
    </CostCard>
  )
}
