import { formatINR } from '@/lib/planner/calc'
import { selectPerPerson, selectTotal, useTrip } from '@/lib/planner/store'
import { AutoTextarea } from './ui'

function exportJson() {
  const { trip } = useTrip.getState()
  const blob = new Blob([JSON.stringify(trip, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(trip.title || 'trip').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function TripHeader() {
  const title = useTrip((s) => s.trip.title)
  const startDate = useTrip((s) => s.trip.startDate)
  const travellers = useTrip((s) => s.trip.travellers)
  const dark = useTrip((s) => s.dark)
  const total = useTrip(selectTotal)
  const per = useTrip(selectPerPerson)
  const { setTitle, setStartDate, setTravellers, toggleDark } = useTrip.getState()

  return (
    <header className="tp-no-print border-b-2 border-tp-line bg-tp-surface px-4 py-4 lg:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-[16rem] flex-1 basis-[28rem]">
          <AutoTextarea
            singleLine
            aria-label="Trip name"
            value={title}
            placeholder="Name your trip"
            onChange={setTitle}
            className="!border-transparent !bg-transparent !px-0 font-tp-display !text-4xl font-bold leading-tight sm:!text-4xl"
          />
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
            <label className="flex items-center gap-2 text-base font-semibold">
              Start date
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="tp-field !w-auto"
              />
            </label>
            <div className="flex items-center gap-2 text-base font-semibold">
              <span id="trav">Travellers</span>
              <button className="tp-btn !px-0 w-12 text-xl" aria-label="Fewer travellers" onClick={() => setTravellers(travellers - 1)}>
                -
              </button>
              <span aria-labelledby="trav" className="w-8 text-center text-xl font-bold">
                {travellers}
              </span>
              <button className="tp-btn !px-0 w-12 text-xl" aria-label="More travellers" onClick={() => setTravellers(travellers + 1)}>
                +
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
          <div aria-live="polite">
            <div className="text-sm font-bold uppercase tracking-widest text-tp-ink2">Total cost</div>
            <div className="font-tp-display text-6xl font-extrabold leading-none text-tp-accent sm:text-7xl">{formatINR(total)}</div>
          </div>
          <div>
            <div className="text-sm font-bold uppercase tracking-widest text-tp-ink2">Per person</div>
            <div className="font-tp-display text-4xl font-bold leading-none sm:text-5xl">{formatINR(per)}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="tp-btn" onClick={() => window.print()}>
              Print summary
            </button>
            <button className="tp-btn" onClick={exportJson}>
              Download JSON
            </button>
            <button className="tp-btn" onClick={toggleDark} aria-pressed={dark}>
              {dark ? 'Light mode' : 'Dark mode'}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
