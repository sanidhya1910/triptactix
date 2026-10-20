import { useState } from 'react'
import { Copy, DotsThreeVertical, NotePencil } from '@phosphor-icons/react/ssr'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { sharersOf } from '@/lib/planner/calc'
import { useActiveTrip, useTrip } from '@/lib/planner/store'
import type { Item } from '@/lib/planner/types'
import { cn } from '@/lib/utils'
import { ADD_ORDER, KIND_SHORT, KindIcon } from './kinds'
import { focusSoon, iconButton } from './ui'

const heading = 'text-xs font-medium text-ink-secondary'

/** Everything about one cost that is not its name or amount. */
export function ItemMenu({
  item,
  name,
  onAddNote,
  noteOpen,
}: {
  item: Item
  name: string
  onAddNote: () => void
  noteOpen: boolean
}) {
  const trip = useActiveTrip()
  const updateItem = useTrip((s) => s.updateItem)
  const duplicateItem = useTrip((s) => s.duplicateItem)
  const [open, setOpen] = useState(false)

  const group = trip.people.length > 1
  const sharers = new Set(sharersOf(trip, item))
  const payerId = `item-${item.id}-payer`

  const toggleSharer = (id: string) => {
    const next = new Set(sharers)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    if (next.size === 0) return // a cost must be shared by someone
    // Everyone ticked is stored as [], so people added later share it too.
    updateItem(item.id, { sharedBy: next.size === trip.people.length ? [] : [...next] })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`More for ${name}`} className={iconButton}>
          <DotsThreeVertical className="h-4 w-4" weight="bold" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-4">
          <p className={heading} id={`item-${item.id}-type`}>
            Type
          </p>
          <div role="group" aria-labelledby={`item-${item.id}-type`} className="mt-2 grid grid-cols-4 gap-1.5">
            {ADD_ORDER.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={item.kind === k}
                onClick={() => updateItem(item.id, { kind: k })}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-md border px-1 py-2 text-[0.6875rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                  item.kind === k
                    ? 'border-brand bg-brand-soft text-ink'
                    : 'border-line text-ink-secondary hover:border-ink/30 hover:text-ink',
                )}
              >
                <KindIcon kind={k} />
                {KIND_SHORT[k]}
              </button>
            ))}
          </div>
        </div>

        {group && (
          <div className="space-y-4 border-t border-line p-4">
            <div>
              <label htmlFor={payerId} className={heading}>
                Paid by
              </label>
              <select
                id={payerId}
                value={item.paidBy && trip.people.some((p) => p.id === item.paidBy) ? item.paidBy : ''}
                onChange={(e) => updateItem(item.id, { paidBy: e.target.value || null })}
                className="mt-2 h-9 w-full rounded-md border border-line-strong bg-surface px-2.5 text-sm text-ink transition-colors hover:border-ink/25 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
              >
                <option value="">Not decided yet</option>
                {trip.people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || 'Unnamed traveller'}
                  </option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend className={heading}>
                Shared by{' '}
                <span className="font-normal text-ink-tertiary">
                  {sharers.size === trip.people.length ? '(everyone)' : `(${sharers.size} of ${trip.people.length})`}
                </span>
              </legend>
              <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                {trip.people.map((p) => {
                  const checked = sharers.has(p.id)
                  const last = checked && sharers.size === 1
                  return (
                    <li key={p.id}>
                      <label className={cn('flex items-center gap-2 text-sm text-ink', last ? 'cursor-not-allowed' : 'cursor-pointer')}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={last}
                          onChange={() => toggleSharer(p.id)}
                          className="h-4 w-4 accent-[var(--brand)]"
                        />
                        <span className="truncate">{p.name || 'Unnamed traveller'}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </fieldset>
          </div>
        )}

        <div className="flex border-t border-line p-1.5">
          {!noteOpen && (
            <MenuAction
              onClick={() => {
                setOpen(false)
                onAddNote()
              }}
            >
              <NotePencil className="h-4 w-4" />
              Add note
            </MenuAction>
          )}
          <MenuAction
            onClick={() => {
              const id = duplicateItem(item.id)
              setOpen(false)
              if (id) focusSoon(`item-${id}-title`)
            }}
          >
            <Copy className="h-4 w-4" />
            Duplicate
          </MenuAction>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function MenuAction({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 flex-1 items-center justify-center gap-2 rounded-md text-sm text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      {children}
    </button>
  )
}
