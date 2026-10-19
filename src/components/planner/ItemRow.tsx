import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Item } from '@/lib/planner/types'
import { KINDS } from '@/lib/planner/types'
import { useTrip } from '@/lib/planner/store'
import { AmountInput, AutoTextarea, GripIcon, KindDot, TrashIcon } from './ui'

export function ItemRow({ item }: { item: Item }) {
  const updateItem = useTrip((s) => s.updateItem)
  const removeItem = useTrip((s) => s.removeItem)
  const [noteOpen, setNoteOpen] = useState(item.note !== '' || (item.title === 'Note' && item.kind === 'other'))
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, data: { type: 'item' } })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="grid grid-cols-[auto_auto_1fr_auto] items-start gap-x-2 gap-y-2 rounded-xl border-2 border-tp-line bg-tp-surface2 p-2 sm:grid-cols-[auto_auto_1fr_11rem_auto]"
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Drag ${item.title || 'item'}. Press space to lift, arrow keys to move.`}
        className="flex h-12 w-10 cursor-grab touch-none items-center justify-center rounded-lg text-tp-ink2 hover:bg-tp-surface"
      >
        <GripIcon />
      </button>
      <span className="flex h-12 items-center" title={KINDS[item.kind].label}>
        <KindDot kind={item.kind} />
      </span>
      <div className="col-span-2 min-w-0 sm:col-span-1">
        <AutoTextarea
          singleLine
          aria-label="Item name"
          placeholder={KINDS[item.kind].label}
          value={item.title}
          onChange={(title) => updateItem(item.id, { title })}
          className="!text-[17px] font-semibold"
        />
        {noteOpen ? (
          <AutoTextarea
            aria-label="Item note"
            placeholder="Write a note"
            value={item.note}
            onChange={(note) => updateItem(item.id, { note })}
            className="mt-2 !text-base"
          />
        ) : (
          <button
            onClick={() => setNoteOpen(true)}
            className="mt-1 min-h-10 rounded-lg px-1 text-base font-semibold text-tp-accent underline underline-offset-4"
          >
            Add note
          </button>
        )}
      </div>
      <div className="col-start-3 sm:col-start-auto">
        <AmountInput label={`Cost of ${item.title || 'item'}`} value={item.amount} onChange={(amount) => updateItem(item.id, { amount })} />
      </div>
      <button
        onClick={() => removeItem(item.id)}
        aria-label={`Delete ${item.title || 'item'}`}
        className="flex h-12 w-12 items-center justify-center rounded-lg text-tp-danger hover:bg-tp-surface"
      >
        <TrashIcon />
      </button>
    </div>
  )
}
