import { useDraggable } from '@dnd-kit/core'
import { useState } from 'react'
import type { ItemKind } from '@/lib/planner/types'
import { DEFAULT_PLACES, QUICK_TILES } from '@/lib/planner/seed'
import { useTrip } from '@/lib/planner/store'
import { KindDot } from './ui'

function Tile({ id, label, kind, title, onRemove }: { id: string; label: string; kind: ItemKind; title: string; onRemove?: () => void }) {
  const addToSelected = useTrip((s) => s.addToSelected)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data: { type: 'tile', kind, title, label } })
  return (
    <div className="flex shrink-0 items-stretch">
      <button
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onClick={() => addToSelected(kind, title)}
        style={{ opacity: isDragging ? 0.4 : 1 }}
        aria-roledescription="tile"
        className={`flex min-h-12 cursor-grab touch-manipulation items-center gap-2 border-2 border-tp-line bg-tp-surface px-3 text-left text-[17px] font-semibold hover:border-tp-accent ${
          onRemove ? 'rounded-l-xl border-r-0' : 'rounded-xl'
        }`}
      >
        <KindDot kind={kind} />
        {label}
      </button>
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Remove place ${label}`}
          className="w-11 rounded-r-xl border-2 border-tp-line bg-tp-surface text-xl font-bold text-tp-danger hover:border-tp-danger"
        >
          ×
        </button>
      )}
    </div>
  )
}

export function TileLibrary() {
  const customPlaces = useTrip((s) => s.trip.customPlaces)
  const addPlace = useTrip((s) => s.addPlace)
  const removePlace = useTrip((s) => s.removePlace)
  const [draft, setDraft] = useState('')

  const submit = () => {
    addPlace(draft)
    setDraft('')
  }

  return (
    <aside
      aria-label="Tile library"
      className="tp-no-print sticky top-16 z-20 border-b-2 border-tp-line bg-tp-surface lg:z-10 lg:max-h-[calc(100vh-4rem)] lg:w-[280px] lg:shrink-0 lg:self-start lg:overflow-y-auto lg:border-b-0 lg:border-r-2"
    >
      <div className="flex gap-6 overflow-x-auto p-3 lg:block lg:space-y-6 lg:p-5">
        <section className="flex shrink-0 items-center gap-2 lg:block lg:shrink">
          <h2 className="shrink-0 text-lg font-bold lg:mb-3 lg:text-xl">Places</h2>
          <div className="flex gap-2 lg:flex-wrap">
            {DEFAULT_PLACES.map((p) => (
              <Tile key={p} id={`tile:place:${p}`} label={p} kind="place" title={p} />
            ))}
            {customPlaces.map((p) => (
              <Tile key={p} id={`tile:custom:${p}`} label={p} kind="place" title={p} onRemove={() => removePlace(p)} />
            ))}
          </div>
          <form
            className="flex shrink-0 gap-2 lg:mt-3"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <input
              className="tp-field w-36 lg:w-full"
              aria-label="New place name"
              placeholder="Add a place"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" className="tp-btn tp-btn-primary">
              Add
            </button>
          </form>
        </section>
        <section className="order-first flex shrink-0 items-center gap-2 lg:order-none lg:block lg:shrink">
          <h2 className="shrink-0 text-lg font-bold lg:mb-3 lg:text-xl">Quick add</h2>
          <div className="flex gap-2 lg:flex-wrap">
            {QUICK_TILES.map((t) => (
              <Tile key={t.label} id={`tile:quick:${t.label}`} label={t.label} kind={t.kind} title={t.title} />
            ))}
          </div>
        </section>
      </div>
      <p className="hidden px-5 pb-5 text-base text-tp-ink2 lg:block">
        Click a tile to add it to the day marked Adding here, or drag it onto any day.
      </p>
    </aside>
  )
}
