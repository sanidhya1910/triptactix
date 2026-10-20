'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { CollisionDetection, DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { ArrowLeft, DownloadSimple, MagnifyingGlass, Plus, Printer } from '@phosphor-icons/react/ssr'
import { AppShell } from '@/components/layout/AppShell'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { allItems, formatINR } from '@/lib/planner/calc'
import { containerOf, useActiveTrip, useTrip } from '@/lib/planner/store'
import { exportFile } from '@/lib/planner/storage'
import type { Item } from '@/lib/planner/types'
import { KINDS, WHOLE } from '@/lib/planner/types'
import { BudgetList } from './BudgetList'
import { DayCard, dayTitleId } from './DayCard'
import { RemoveDayDialog, RemovePersonDialog, SaveFailedNotice, UndoToasts } from './Feedback'
import { KindTile } from './kinds'
import { PrintSummary } from './PrintSummary'
import { SharedCosts } from './SharedCosts'
import { MobileTotalBar, Summary } from './Summary'
import { TripDetails } from './TripDetails'
import { focusSoon } from './ui'

/**
 * /planner lists budgets; /planner?trip=<id> opens one. The id is read here, on the
 * client, so the route itself stays a static page.
 */
export default function PlannerRoute() {
  const tripId = useSearchParams().get('trip')
  const exists = useTrip((s) => (tripId ? s.trips.some((t) => t.id === tripId) : false))
  const activeId = useTrip((s) => s.activeId)
  const setActive = useTrip((s) => s.setActive)

  useEffect(() => {
    setActive(tripId && exists ? tripId : null)
  }, [tripId, exists, setActive])
  useEffect(() => () => setActive(null), [setActive])

  return (
    <>
      {!tripId ? (
        <div className="print:hidden">
          <BudgetList />
          <SiteFooter />
        </div>
      ) : !exists ? (
        <TripNotFound />
      ) : activeId === tripId ? (
        <Editor />
      ) : null}
      <UndoToasts />
      <SaveFailedNotice />
    </>
  )
}

function TripNotFound() {
  return (
    <AppShell width="narrow">
      <EmptyState
        icon={<MagnifyingGlass className="h-6 w-6" />}
        title="That budget isn’t on this device"
        description="Budgets are saved in this browser only, so a link opened on another device or after clearing site data has nothing to show. If you downloaded it, you can import the file."
        action={
          <Button asChild>
            <Link href="/planner">All budgets</Link>
          </Button>
        }
        as="h1"
      />
    </AppShell>
  )
}

/** Prefer the item under the pointer, then the card, then fall back to rectangle overlap. */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  if (hits.length) {
    const items = hits.filter((h) => h.data?.droppableContainer?.data?.current?.type === 'item')
    return items.length ? items : hits
  }
  return rectIntersection(args)
}

function download(name: string, contents: string) {
  const blob = new Blob([contents], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(name || 'trip').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`
  a.click()
  // Revoking in the same tick can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function Editor() {
  const trip = useActiveTrip()
  const addDay = useTrip((s) => s.addDay)
  const [dragging, setDragging] = useState<Item | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  )

  // Suggest place names already used on this trip, so a stop typed once is one pick away.
  const places = useMemo(() => {
    const used = allItems(trip)
      .filter((i) => i.kind === 'place')
      .map((i) => i.title.trim())
    return [...new Set([...trip.customPlaces, ...used].filter(Boolean))].sort((a, b) => a.localeCompare(b))
  }, [trip])

  const onStart = (e: DragStartEvent) => setDragging(allItems(trip).find((i) => i.id === e.active.id) ?? null)

  const onEnd = (e: DragEndEvent) => {
    setDragging(null)
    const { active, over } = e
    if (!over) return
    const { moveItem } = useTrip.getState()
    const overId = String(over.id)
    const isContainer = overId === WHOLE || trip.days.some((d) => d.id === overId)
    const container = isContainer ? overId : containerOf(trip, overId)
    if (!container || String(active.id) === overId) return
    const list = container === WHOLE ? trip.wholeTrip : trip.days.find((d) => d.id === container)!.items
    const index = isContainer ? list.length : list.findIndex((i) => i.id === overId)
    moveItem(String(active.id), container, index)
  }

  const newDay = () => {
    const id = addDay()
    if (id) focusSoon(dayTitleId(id), { scroll: true })
  }

  return (
    <>
      <div className="print:hidden">
        <AppShell width="wide">
          <Link
            href="/planner"
            className="inline-flex items-center gap-1.5 rounded-md text-sm text-ink-secondary transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <ArrowLeft className="h-3.5 w-3.5" weight="bold" />
            All budgets
          </Link>
          <header className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <div className="min-w-0">
              <h1 className="text-display-sm break-words text-ink">{trip.title || 'Untitled budget'}</h1>
              <p className="mt-3 max-w-xl text-ink-secondary">
                {trip.source?.kind === 'itinerary'
                  ? 'Made from your AI itinerary. The costs are its estimates, so adjust them as you book.'
                  : 'Saved on this device as you type.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={() => download(trip.title, exportFile(trip))}>
                <DownloadSimple className="h-4 w-4" />
                Download
              </Button>
            </div>
          </header>

          <DndContext
            sensors={sensors}
            collisionDetection={collision}
            onDragStart={onStart}
            onDragEnd={onEnd}
            onDragCancel={() => setDragging(null)}
          >
            <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
              <div className="min-w-0 space-y-5">
                <TripDetails />
                <SharedCosts />
                {trip.days.map((d, i) => (
                  <DayCard key={d.id} day={d} index={i} />
                ))}
                <Button variant="outline" className="h-12 w-full border-dashed text-ink-secondary" onClick={newDay}>
                  <Plus className="h-4 w-4" weight="bold" />
                  Add day {trip.days.length + 1}
                </Button>
              </div>

              <Summary />
            </div>

            <DragOverlay>
              {dragging && (
                <div className="flex items-center gap-2 rounded-md border border-brand bg-surface px-3 py-2 text-sm shadow-lg">
                  <KindTile kind={dragging.kind} />
                  <span className="font-medium text-ink">{dragging.title || KINDS[dragging.kind].label}</span>
                  {dragging.amount > 0 && (
                    <span className="ml-2 font-mono text-ink-secondary [font-variant-numeric:tabular-nums]">
                      {formatINR(dragging.amount)}
                    </span>
                  )}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </AppShell>
        <SiteFooter />
        <MobileTotalBar />
      </div>

      <datalist id="planner-places">
        {places.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <PrintSummary />
      <RemoveDayDialog />
      <RemovePersonDialog />
    </>
  )
}
