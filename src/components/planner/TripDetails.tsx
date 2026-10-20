import { useState } from 'react'
import { Plus, X } from '@phosphor-icons/react/ssr'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useActiveTrip, useTrip } from '@/lib/planner/store'
import { AmountInput, AutoTextarea, focusSoon } from './ui'

const personInputId = (id: string) => `person-${id}-name`

export function TripDetails() {
  const trip = useActiveTrip()
  const { setTitle, setStartDate, setNotes, setBudget } = useTrip.getState()

  return (
    <section aria-labelledby="trip-details-heading" className="rounded-lg border border-line bg-surface p-5 sm:p-6">
      <h2 id="trip-details-heading" className="text-base font-semibold text-ink">
        Trip details
      </h2>

      <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,1fr)_11rem_10rem]">
        <Field label="Trip name" htmlFor="trip-name">
          <Input id="trip-name" value={trip.title} placeholder="Goa with friends" onChange={(e) => setTitle(e.target.value)} />
        </Field>

        <Field label="Start date" htmlFor="trip-start">
          <Input
            id="trip-start"
            type="date"
            value={trip.startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="[font-variant-numeric:tabular-nums]"
          />
        </Field>

        <Field label="Budget" htmlFor="trip-budget" hint="Optional spending limit">
          <AmountInput
            id="trip-budget"
            label="Budget for the whole trip"
            value={trip.budget ?? 0}
            onChange={(n) => setBudget(n || null)}
            className="h-10 border-line-strong"
          />
        </Field>
      </div>

      <People />

      <Field label="Notes" htmlFor="trip-notes" className="mt-5">
        <AutoTextarea
          id="trip-notes"
          value={trip.notes}
          placeholder="Anything to remember for this trip"
          onChange={setNotes}
          className="min-h-20 border-line-strong bg-surface px-3 py-2 hover:border-ink/25"
        />
      </Field>
    </section>
  )
}

/**
 * The travellers, by name. Names are what settling up talks about ("Ravi pays Asha"),
 * so they replace the old traveller count. There is always at least one.
 */
function People() {
  const trip = useActiveTrip()
  const { addPerson, renamePerson, requestRemovePerson } = useTrip.getState()
  const [draft, setDraft] = useState('')

  const add = () => {
    const id = addPerson(draft)
    setDraft('')
    if (id && !draft.trim()) focusSoon(personInputId(id))
  }

  const solo = trip.people.length === 1
  return (
    <fieldset className="mt-5">
      <legend className="text-sm font-medium text-ink">
        Travellers <span className="font-normal text-ink-tertiary">({trip.people.length})</span>
      </legend>
      <p className="mt-1 text-xs text-ink-tertiary">
        {solo ? 'Add the people you are travelling with to split costs and settle up.' : 'Each cost is split among everyone unless you choose otherwise.'}
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {trip.people.map((p, i) => (
          <li
            key={p.id}
            className="flex h-9 items-center rounded-md border border-line-strong bg-surface pl-1 transition-[border-color,box-shadow] duration-200 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15"
          >
            <input
              id={personInputId(p.id)}
              aria-label={`Traveller ${i + 1} name`}
              value={p.name}
              placeholder={`Traveller ${i + 1}`}
              onChange={(e) => renamePerson(p.id, e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              // Size to the name so short names stay short chips.
              size={Math.max(6, Math.min(20, (p.name || `Traveller ${i + 1}`).length + 1))}
              className="h-full bg-transparent px-1.5 text-sm text-ink outline-none placeholder:text-ink-tertiary"
            />
            {!solo && (
              <button
                type="button"
                onClick={() => requestRemovePerson(p.id)}
                aria-label={`Remove ${p.name || `traveller ${i + 1}`}`}
                className="flex h-full w-8 items-center justify-center rounded-r-md text-ink-tertiary transition-colors hover:bg-neg hover:text-neg-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <X className="h-3.5 w-3.5" weight="bold" />
              </button>
            )}
          </li>
        ))}
        <li>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              add()
            }}
            className="flex h-9 items-center gap-1"
          >
            <Input
              aria-label="New traveller name"
              value={draft}
              placeholder="Add a name"
              onChange={(e) => setDraft(e.target.value)}
              className="h-9 w-32"
              disabled={trip.people.length >= 50}
            />
            <Button type="submit" variant="outline" size="icon" className="h-9 w-9" aria-label="Add traveller" disabled={trip.people.length >= 50}>
              <Plus className="h-4 w-4" weight="bold" />
            </Button>
          </form>
        </li>
      </ul>
    </fieldset>
  )
}
