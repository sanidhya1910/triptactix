'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Copy, FileArrowUp, Plus, Sparkle, Trash, Users, Wallet } from '@phosphor-icons/react/ssr'
import { AppShell } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { budgetStatus, dateRange, formatINR, totalCost } from '@/lib/planner/calc'
import { useTrip } from '@/lib/planner/store'
import { parseImport } from '@/lib/planner/storage'
import type { Trip } from '@/lib/planner/types'
import { cn } from '@/lib/utils'
import { iconButton } from './ui'

export const tripHref = (id: string) => `/planner?trip=${encodeURIComponent(id)}`

const mono = 'font-mono [font-variant-numeric:tabular-nums]'

/** Files larger than this are not budgets; refuse before reading them into memory. */
const MAX_IMPORT_BYTES = 2_000_000

export function BudgetList() {
  const router = useRouter()
  const trips = useTrip((s) => s.trips)
  const createTrip = useTrip((s) => s.createTrip)
  const addTrips = useTrip((s) => s.addTrips)
  const fileRef = useRef<HTMLInputElement>(null)

  const open = (id: string) => router.push(tripHref(id))

  const importFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_IMPORT_BYTES) {
      toast.error('That file is too large to be a budget')
      return
    }
    const parsed = parseImport(await file.text())
    if (!parsed || parsed.length === 0) {
      toast.error('That file isn’t a Triptactix budget', {
        description: 'Import a file made with the Download button.',
      })
      return
    }
    const ids = addTrips(parsed)
    toast.success(ids.length === 1 ? 'Budget imported' : `Imported ${ids.length} budgets`)
    if (ids.length === 1) open(ids[0])
  }

  const actions = (
    <>
      <Button onClick={() => open(createTrip('blank'))}>
        <Plus className="h-4 w-4" weight="bold" />
        New budget
      </Button>
      <Button variant="outline" onClick={() => open(createTrip('sample'))}>
        <Sparkle className="h-4 w-4" />
        Try the sample
      </Button>
      <Button variant="outline" onClick={() => fileRef.current?.click()}>
        <FileArrowUp className="h-4 w-4" />
        Import
      </Button>
    </>
  )

  // Most recently edited first: the trip you were just working on is the one you want.
  const sorted = [...trips].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return (
    <AppShell width="wide">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-display-sm text-ink">Budget planner</h1>
          <p className="mt-3 max-w-xl text-ink-secondary">
            Cost a trip day by day, split it between travellers, and see who owes whom. Saved on this device only.
          </p>
        </div>
        {sorted.length > 0 && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void importFile(e.target.files?.[0])
          e.target.value = '' // so choosing the same file again still fires
        }}
      />

      {sorted.length === 0 ? (
        <EmptyState
          className="mt-10"
          icon={<Wallet className="h-6 w-6" />}
          title="No budgets yet"
          description="Start from a blank trip, explore a worked example with two travellers, or import a budget you downloaded earlier."
          action={actions}
        />
      ) : (
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((t) => (
            <BudgetCard key={t.id} trip={t} />
          ))}
        </ul>
      )}
    </AppShell>
  )
}

export function BudgetCard({ trip }: { trip: Trip }) {
  const router = useRouter()
  const duplicateTrip = useTrip((s) => s.duplicateTrip)
  const deleteTrip = useTrip((s) => s.deleteTrip)
  const budget = budgetStatus(trip)
  const range = dateRange(trip)
  const name = trip.title || 'Untitled budget'
  const people = trip.people.map((p) => p.name).filter(Boolean)
  const edited = new Date(trip.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

  return (
    <li className="group relative flex flex-col rounded-lg border border-line bg-surface transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-[0_2px_8px_rgba(23,22,20,0.04)] focus-within:border-brand">
      <div className="flex-1 p-5">
        <h2 className="pr-16 text-base font-semibold text-ink">
          {/* The whole card is clickable through this link's stretched hit area. */}
          <Link
            href={tripHref(trip.id)}
            className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none"
          >
            {name}
          </Link>
        </h2>
        <p className="mt-1 text-sm text-ink-secondary">
          {range || 'No start date'} · {trip.days.length} {trip.days.length === 1 ? 'day' : 'days'}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-tertiary">
          <Users aria-hidden className="h-3.5 w-3.5" />
          <span className="truncate">
            {trip.people.length === 1 ? people[0] || '1 traveller' : `${trip.people.length} travellers${people.length ? `: ${people.join(', ')}` : ''}`}
          </span>
        </p>
      </div>

      <div className="flex items-end justify-between gap-3 border-t border-line px-5 py-4">
        <div>
          <div className={cn(mono, 'text-xl text-ink')}>{formatINR(totalCost(trip))}</div>
          <div className="text-xs text-ink-tertiary">Edited {edited}</div>
        </div>
        {budget && (
          <Badge variant={budget.over ? 'negative' : 'positive'}>
            <span className={mono}>{formatINR(Math.abs(budget.remaining))}</span>&nbsp;{budget.over ? 'over' : 'left'}
          </Badge>
        )}
      </div>

      {/* Above the stretched link, so these stay separately clickable. */}
      <div className="absolute right-3 top-3 z-10 flex">
        <button
          type="button"
          aria-label={`Duplicate ${name}`}
          className={iconButton}
          onClick={() => {
            const id = duplicateTrip(trip.id)
            if (id) router.push(tripHref(id))
          }}
        >
          <Copy className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={`Delete ${name}`}
          className={cn(iconButton, 'hover:bg-neg hover:text-neg-fg')}
          onClick={() => deleteTrip(trip.id)}
        >
          <Trash className="h-4 w-4" />
        </button>
      </div>
    </li>
  )
}
