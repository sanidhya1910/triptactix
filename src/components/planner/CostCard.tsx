import type { ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from '@phosphor-icons/react/ssr'
import type { Item, ItemKind } from '@/lib/planner/types'
import { formatINR, sumItems } from '@/lib/planner/calc'
import { useTrip } from '@/lib/planner/store'
import { cn } from '@/lib/utils'
import { ADD_ORDER, KIND_SHORT, KindIcon } from './kinds'
import { ItemRow, itemTitleId } from './ItemRow'
import { focusSoon } from './ui'

interface CostCardProps {
  /** Store container id: a day id, or WHOLE for shared costs. */
  id: string
  /** DOM id, used by the summary's jump links. */
  anchor: string
  headingId: string
  /** Spoken name of this card, e.g. "Day 2", so the add buttons are distinguishable. */
  label: string
  /** The short line at the top: the h2, e.g. "Day 2, Sun 15 Nov". */
  heading: ReactNode
  /** The longer line under it, e.g. the editable day name. Full width on phones. */
  title?: ReactNode
  /** Buttons shown beside the subtotal, such as removing a day. */
  actions?: ReactNode
  /** Content between the header and the list, such as day notes. */
  children?: ReactNode
  items: Item[]
  /** Kinds offered first in the add row, e.g. flights and stays for shared costs. */
  kinds?: ItemKind[]
}

export function CostCard({
  id,
  anchor,
  headingId,
  label,
  heading,
  title,
  actions,
  children,
  items,
  kinds = ADD_ORDER,
}: CostCardProps) {
  const addItem = useTrip((s) => s.addItem)
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: 'container' } })

  const add = (kind: ItemKind) => focusSoon(itemTitleId(addItem(id, kind)))

  return (
    <section
      id={anchor}
      aria-labelledby={headingId}
      className={cn(
        'scroll-mt-24 rounded-lg border bg-surface transition-[border-color,box-shadow] duration-200',
        isOver ? 'border-brand ring-2 ring-brand/15' : 'border-line',
      )}
    >
      {/*
        Phones: heading and subtotal share the first line, and the title takes a full line
        of its own. A day name squeezed beside the subtotal and two buttons gets about 140px.
        From sm up the subtotal spans both lines on the right instead.
      */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-0.5 border-b border-line px-4 py-4 sm:px-5">
        <div className="min-w-0 self-center">{heading}</div>
        <div className="flex items-start gap-1 sm:row-span-2">
          <div className="pr-1 text-right">
            <div className="font-mono text-lg text-ink [font-variant-numeric:tabular-nums]">
              {formatINR(sumItems(items))}
            </div>
            <div className="text-xs text-ink-tertiary">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </div>
          </div>
          {actions}
        </div>
        {title && <div className="col-span-2 min-w-0 sm:col-span-1">{title}</div>}
      </div>

      {children}

      <div ref={setNodeRef}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.length > 0 ? (
            <ul className="divide-y divide-line">
              {items.map((i) => (
                <ItemRow key={i.id} item={i} />
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-ink-tertiary">
              Nothing here yet. Add a cost below, or drag one in from another day.
            </p>
          )}
        </SortableContext>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 rounded-b-lg border-t border-line bg-surface-sunken/60 px-3 py-2.5 sm:px-4">
        <span className="mr-1 flex items-center gap-1 text-xs font-medium text-ink-secondary">
          <Plus aria-hidden className="h-3.5 w-3.5" weight="bold" />
          Add
        </span>
        {kinds.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => add(k)}
            aria-label={`Add ${KIND_SHORT[k].toLowerCase()} to ${label}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-xs font-medium text-ink transition-[border-color,background-color,transform] duration-200 hover:border-ink/30 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:scale-[0.98]"
          >
            <KindIcon kind={k} className="h-3.5 w-3.5 text-ink-secondary" />
            {KIND_SHORT[k]}
          </button>
        ))}
      </div>
    </section>
  )
}
