import {
  budgetStatus,
  costByKind,
  dayDate,
  formatINR,
  isSubset,
  payerOf,
  perPerson,
  settleUp,
  sharersOf,
  sumItems,
  totalCost,
  unassigned,
} from '@/lib/planner/calc'
import type { Item, Trip } from '@/lib/planner/types'
import { KINDS, SPLIT_ORDER } from '@/lib/planner/types'
import { useActiveTrip } from '@/lib/planner/store'

const mono = 'font-mono [font-variant-numeric:tabular-nums]'
const nameOf = (trip: Trip, id: string) => trip.people.find((p) => p.id === id)?.name || 'Unnamed traveller'

function Rows({ trip, items }: { trip: Trip; items: Item[] }) {
  if (items.length === 0) return <p className="mt-2 text-sm text-ink-tertiary">No costs</p>
  const group = trip.people.length > 1
  return (
    <table className="mt-2 w-full border-collapse text-sm">
      <tbody>
        {items.map((i) => {
          const payer = payerOf(trip, i)
          const who = isSubset(trip, i) ? sharersOf(trip, i).map((id) => nameOf(trip, id)).join(', ') : ''
          return (
            <tr key={i.id} className="border-b border-line align-top">
              <td className="py-1.5 pr-4">
                <span className="text-ink">{i.title || KINDS[i.kind].label}</span>
                <span className="ml-2 text-xs text-ink-tertiary">{KINDS[i.kind].label}</span>
                {i.note && <span className="block text-xs text-ink-secondary">{i.note}</span>}
                {group && (payer || who) && (
                  <span className="block text-xs text-ink-tertiary">
                    {payer && `Paid by ${payer.name}`}
                    {payer && who && '. '}
                    {who && `Shared by ${who}`}
                  </span>
                )}
              </td>
              <td className={`${mono} py-1.5 text-right text-ink`}>{i.amount ? formatINR(i.amount) : ''}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/** Only rendered on paper. The interactive page is hidden by print:hidden. */
export function PrintSummary() {
  const trip = useActiveTrip()
  const split = costByKind(trip)
  const budget = budgetStatus(trip)
  const transfers = trip.people.length > 1 ? settleUp(trip) : []
  const missing = unassigned(trip)

  return (
    <div className="hidden bg-surface p-2 text-ink print:block">
      <h1 className="text-display-sm">{trip.title || 'Trip budget'}</h1>
      <p className="mt-2 text-sm text-ink-secondary">
        {trip.startDate && `Starts ${dayDate(trip.startDate, 0)}. `}
        {trip.days.length} {trip.days.length === 1 ? 'day' : 'days'}. {trip.people.map((p) => p.name).join(', ')}.
      </p>
      <p className="mt-4 text-lg">
        Total <span className={mono}>{formatINR(totalCost(trip))}</span>, or{' '}
        <span className={mono}>{formatINR(perPerson(trip))}</span> per person
      </p>
      {budget && (
        <p className="mt-1 text-sm">
          Budget <span className={mono}>{formatINR(budget.budget)}</span>:{' '}
          <span className={mono}>{formatINR(Math.abs(budget.remaining))}</span> {budget.over ? 'over' : 'left'}
        </p>
      )}
      <p className="mt-1 text-sm text-ink-secondary">
        {SPLIT_ORDER.filter((k) => split[k] > 0)
          .map((k) => `${KINDS[k].split} ${formatINR(split[k])}`)
          .join(' · ')}
      </p>

      {transfers.length > 0 && (
        <section className="mt-5 break-inside-avoid">
          <h2 className="text-base font-semibold">Settle up</h2>
          <ul className="mt-1 text-sm">
            {transfers.map((t) => (
              <li key={`${t.from}-${t.to}`}>
                {nameOf(trip, t.from)} pays {nameOf(trip, t.to)} <span className={mono}>{formatINR(t.amount)}</span>
              </li>
            ))}
          </ul>
          {missing.count > 0 && (
            <p className="mt-1 text-xs text-ink-secondary">
              Not counted: {missing.count} {missing.count === 1 ? 'cost' : 'costs'} ({formatINR(missing.amount)}) with no payer.
            </p>
          )}
        </section>
      )}

      {trip.notes && <p className="mt-4 whitespace-pre-wrap text-sm">{trip.notes}</p>}

      <section className="mt-6 break-inside-avoid">
        <h2 className="flex justify-between text-base font-semibold">
          <span>Shared costs</span>
          <span className={mono}>{formatINR(sumItems(trip.wholeTrip))}</span>
        </h2>
        <Rows trip={trip} items={trip.wholeTrip} />
      </section>

      {trip.days.map((d, i) => (
        <section key={d.id} className="mt-6 break-inside-avoid">
          <h2 className="flex justify-between gap-4 text-base font-semibold">
            <span>
              Day {i + 1}
              {dayDate(trip.startDate, i) && `, ${dayDate(trip.startDate, i)}`}
              {d.title && <span className="font-normal text-ink-secondary">: {d.title}</span>}
            </span>
            <span className={mono}>{formatINR(sumItems(d.items))}</span>
          </h2>
          {d.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-ink-secondary">{d.notes}</p>}
          <Rows trip={trip} items={d.items} />
        </section>
      ))}
    </div>
  )
}
