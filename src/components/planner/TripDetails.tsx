import { Minus, Plus } from '@phosphor-icons/react/ssr'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useTrip } from '@/lib/planner/store'
import { AutoTextarea } from './ui'

export function TripDetails() {
  const title = useTrip((s) => s.trip.title)
  const startDate = useTrip((s) => s.trip.startDate)
  const travellers = useTrip((s) => s.trip.travellers)
  const notes = useTrip((s) => s.trip.notes)
  const { setTitle, setStartDate, setTravellers, setNotes } = useTrip.getState()

  return (
    <section aria-labelledby="trip-details-heading" className="rounded-lg border border-line bg-surface p-5 sm:p-6">
      <h2 id="trip-details-heading" className="text-base font-semibold text-ink">
        Trip details
      </h2>

      <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,1fr)_11rem_auto]">
        <Field label="Trip name" htmlFor="trip-name">
          <Input
            id="trip-name"
            value={title}
            placeholder="Goa with friends"
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        <Field label="Start date" htmlFor="trip-start">
          <Input
            id="trip-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="[font-variant-numeric:tabular-nums]"
          />
        </Field>

        <Field label="Travellers" htmlFor="trip-travellers">
          <div className="flex h-10 items-center rounded-md border border-line-strong bg-surface">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-full w-9 rounded-r-none"
              aria-label="One fewer traveller"
              disabled={travellers <= 1}
              onClick={() => setTravellers(travellers - 1)}
            >
              <Minus className="h-3.5 w-3.5" weight="bold" />
            </Button>
            <output
              id="trip-travellers"
              aria-live="polite"
              className="w-9 text-center font-mono text-sm text-ink [font-variant-numeric:tabular-nums]"
            >
              {travellers}
            </output>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-full w-9 rounded-l-none"
              aria-label="One more traveller"
              disabled={travellers >= 50}
              onClick={() => setTravellers(travellers + 1)}
            >
              <Plus className="h-3.5 w-3.5" weight="bold" />
            </Button>
          </div>
        </Field>
      </div>

      <Field label="Notes" htmlFor="trip-notes" className="mt-5">
        <AutoTextarea
          id="trip-notes"
          value={notes}
          placeholder="Anything to remember for this trip"
          onChange={setNotes}
          className="min-h-20 border-line-strong bg-surface px-3 py-2 hover:border-ink/25"
        />
      </Field>
    </section>
  )
}
