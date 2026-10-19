import { useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'
import { useTrip } from '@/lib/planner/store'

/** A card that accepts dropped tiles and items, and can be the selected "Adding here" target. */
export function DropCard({ id, children, label }: { id: string; children: ReactNode; label: string }) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: 'container' } })
  const selected = useTrip((s) => s.selected === id)
  const select = useTrip((s) => s.select)
  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      onClick={() => select(id)}
      onFocusCapture={() => select(id)}
      className={`rounded-2xl border-[3px] p-4 sm:p-6 ${isOver ? 'bg-tp-accentsoft' : 'bg-tp-surface'} ${
        selected ? 'border-tp-accent shadow-[0_0_0_4px_var(--accent-soft)]' : 'border-tp-line'
      }`}
    >
      {children}
    </section>
  )
}

export function AddingHere({ id }: { id: string }) {
  const selected = useTrip((s) => s.selected === id)
  const select = useTrip((s) => s.select)
  return selected ? (
    <span className="inline-flex min-h-9 items-center rounded-full bg-tp-accent px-3 text-sm font-bold uppercase tracking-wide text-tp-accentink">
      Adding here
    </span>
  ) : (
    <button
      onClick={() => select(id)}
      className="min-h-9 rounded-full border-2 border-tp-line px-3 text-sm font-bold text-tp-ink2 hover:border-tp-accent"
    >
      Add tiles here
    </button>
  )
}
