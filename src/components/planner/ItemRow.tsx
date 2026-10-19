import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DotsSixVertical, NotePencil, Trash } from '@phosphor-icons/react/ssr'
import type { Item } from '@/lib/planner/types'
import { KINDS } from '@/lib/planner/types'
import { useTrip } from '@/lib/planner/store'
import { cn } from '@/lib/utils'
import { KindTile } from './kinds'
import { AmountInput, AutoTextarea, InlineInput, focusSoon, iconButton } from './ui'


export const itemTitleId = (id: string) => `item-${id}-title`

export function ItemRow({ item }: { item: Item }) {
  const updateItem = useTrip((s) => s.updateItem)
  const removeItem = useTrip((s) => s.removeItem)
  const [noteOpen, setNoteOpen] = useState(item.note !== '')
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, data: { type: 'item' } })

  const name = item.title || KINDS[item.kind].label
  const noteId = `item-${item.id}-note`

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group grid grid-cols-[1.5rem_2rem_minmax(0,1fr)_4.5rem] items-start gap-x-2 gap-y-1.5 px-2 py-2.5 sm:grid-cols-[1.5rem_2rem_minmax(0,1fr)_8rem_4.5rem] sm:px-3',
        isDragging && 'relative z-10 opacity-40',
      )}
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Move ${name}. Press space to pick up, arrow keys to move, space to drop.`}
        className="flex h-9 w-6 cursor-grab touch-none items-center justify-center rounded-md text-ink-tertiary transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:cursor-grabbing pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100 pointer-fine:focus-visible:opacity-100"
      >
        <DotsSixVertical className="h-4 w-4" weight="bold" />
      </button>

      <KindTile kind={item.kind} className="mt-0.5" />

      <div className="min-w-0">
        <InlineInput
          id={itemTitleId(item.id)}
          aria-label={`${KINDS[item.kind].label} name`}
          placeholder={KINDS[item.kind].label}
          value={item.title}
          list={item.kind === 'place' ? 'planner-places' : undefined}
          onChange={(e) => updateItem(item.id, { title: e.target.value })}
          className="font-medium"
        />
        {noteOpen && (
          <AutoTextarea
            id={noteId}
            aria-label={`Note for ${name}`}
            placeholder="Add a note"
            value={item.note}
            onChange={(note) => updateItem(item.id, { note })}
            onBlur={() => item.note.trim() === '' && setNoteOpen(false)}
            className="mt-0.5 text-ink-secondary"
          />
        )}
      </div>

      <AmountInput
        label={`Cost of ${name}`}
        value={item.amount}
        onChange={(amount) => updateItem(item.id, { amount })}
        className="col-start-3 row-start-2 w-32 sm:col-start-4 sm:row-start-1 sm:w-auto"
      />

      {/* Fixed width, so a row with its note open still lines its amount up with the rest. */}
      <div className="col-start-4 row-start-1 flex justify-end sm:col-start-5">
        {!noteOpen && (
          <button
            type="button"
            onClick={() => {
              setNoteOpen(true)
              focusSoon(noteId)
            }}
            aria-label={`Add a note to ${name}`}
            className={iconButton}
          >
            <NotePencil className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => removeItem(item.id)}
          aria-label={`Remove ${name}`}
          className={cn(iconButton, 'hover:bg-neg hover:text-neg-fg')}
        >
          <Trash className="h-4 w-4" />
        </button>
      </div>
    </li>
  )
}
