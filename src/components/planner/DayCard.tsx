import { useState } from 'react'
import { ArrowDown, ArrowUp, Copy, DotsThreeVertical, NotePencil, Trash } from '@phosphor-icons/react/ssr'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { dayDate } from '@/lib/planner/calc'
import type { Day } from '@/lib/planner/types'
import { useActiveTrip, useTrip } from '@/lib/planner/store'
import { cn } from '@/lib/utils'
import { CostCard } from './CostCard'
import { AutoTextarea, InlineInput, focusSoon, iconButton } from './ui'

export const dayAnchor = (id: string) => `day-${id}`
export const dayTitleId = (id: string) => `day-${id}-title`

export function DayCard({ day, index }: { day: Day; index: number }) {
  const trip = useActiveTrip()
  const updateDay = useTrip((s) => s.updateDay)
  const [notesOpen, setNotesOpen] = useState(day.notes !== '')

  const n = index + 1
  const date = dayDate(trip.startDate, index)
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
        <DayMenu
          day={day}
          index={index}
          count={trip.days.length}
          notesOpen={notesOpen}
          onAddNotes={() => {
            setNotesOpen(true)
            focusSoon(notesId)
          }}
        />
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

function DayMenu({
  day,
  index,
  count,
  notesOpen,
  onAddNotes,
}: {
  day: Day
  index: number
  count: number
  notesOpen: boolean
  onAddNotes: () => void
}) {
  const moveDay = useTrip((s) => s.moveDay)
  const duplicateDay = useTrip((s) => s.duplicateDay)
  const requestRemoveDay = useTrip((s) => s.requestRemoveDay)
  const [open, setOpen] = useState(false)
  const n = index + 1

  // Each action closes the menu first, then acts, so focus can move to what it created.
  const run = (fn: () => void) => () => {
    setOpen(false)
    fn()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`More for day ${n}`} className={iconButton}>
          <DotsThreeVertical className="h-4 w-4" weight="bold" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1.5">
        <ul className="space-y-0.5">
          {!notesOpen && (
            <Action icon={<NotePencil className="h-4 w-4" />} onClick={run(onAddNotes)}>
              Add notes
            </Action>
          )}
          <Action icon={<ArrowUp className="h-4 w-4" />} disabled={index === 0} onClick={run(() => moveDay(day.id, -1))}>
            Move up
          </Action>
          <Action
            icon={<ArrowDown className="h-4 w-4" />}
            disabled={index === count - 1}
            onClick={run(() => moveDay(day.id, 1))}
          >
            Move down
          </Action>
          <Action
            icon={<Copy className="h-4 w-4" />}
            onClick={run(() => {
              const id = duplicateDay(day.id)
              if (id) focusSoon(dayTitleId(id), { scroll: true })
            })}
          >
            Duplicate day
          </Action>
          <li aria-hidden className="my-1 border-t border-line" />
          <Action icon={<Trash className="h-4 w-4" />} danger onClick={run(() => requestRemoveDay(day.id))}>
            Remove day
          </Action>
        </ul>
      </PopoverContent>
    </Popover>
  )
}

function Action({
  icon,
  children,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:pointer-events-none disabled:opacity-40',
          danger ? 'text-neg-fg hover:bg-neg' : 'text-ink hover:bg-surface-hover',
        )}
      >
        <span className={danger ? '' : 'text-ink-tertiary'}>{icon}</span>
        {children}
      </button>
    </li>
  )
}
