import { costByKind, dayDate, formatINR, perPerson, sumItems, totalCost } from '@/lib/planner/calc'
import type { Item } from '@/lib/planner/types'
import { KINDS, SPLIT_ORDER } from '@/lib/planner/types'
import { useTrip } from '@/lib/planner/store'

const mono = 'font-mono [font-variant-numeric:tabular-nums]'

function Rows({ items }: { items: Item[] }) {
  if (items.length === 0) return <p className="mt-2 text-sm text-ink-tertiary">No costs</p>
  return (
    <table className="mt-2 w-full border-collapse text-sm">
      <tbody>
        {items.map((i) => (
          <tr key={i.id} className="border-b border-line align-top">
            <td className="py-1.5 pr-4">
              <span className="text-ink">{i.title || KINDS[i.kind].label}</span>
              <span className="ml-2 text-xs text-ink-tertiary">{KINDS[i.kind].label}</span>
              {i.note && <span className="block text-xs text-ink-secondary">{i.note}</span>}
            </td>
            <td className={`${mono} py-1.5 text-right text-ink`}>{i.amount ? formatINR(i.amount) : ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Only rendered on paper. The interactive page is hidden by print:hidden. */
export function PrintSummary() {
  const trip = useTrip((s) => s.trip)
  const split = costByKind(trip)
  return (
    <div className="hidden bg-white p-2 text-ink print:block">
      <h1 className="text-display-sm">{trip.title || 'Trip budget'}</h1>
      <p className="mt-2 text-sm text-ink-secondary">
        {trip.startDate && `Starts ${dayDate(trip.startDate, 0)}. `}
        {trip.days.length} {trip.days.length === 1 ? 'day' : 'days'}, {trip.travellers}{' '}
        {trip.travellers === 1 ? 'traveller' : 'travellers'}.
      </p>
      <p className="mt-4 text-lg">
        Total <span className={mono}>{formatINR(totalCost(trip))}</span>, or{' '}
        <span className={mono}>{formatINR(perPerson(trip))}</span> per person
      </p>
      <p className="mt-1 text-sm text-ink-secondary">
        {SPLIT_ORDER.filter((k) => split[k] > 0)
          .map((k) => `${KINDS[k].split} ${formatINR(split[k])}`)
          .join(' · ')}
      </p>
      {trip.notes && <p className="mt-4 whitespace-pre-wrap text-sm">{trip.notes}</p>}

      <section className="mt-6 break-inside-avoid">
        <h2 className="flex justify-between text-base font-semibold">
          <span>Shared costs</span>
          <span className={mono}>{formatINR(sumItems(trip.wholeTrip))}</span>
        </h2>
        <Rows items={trip.wholeTrip} />
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
          <Rows items={d.items} />
        </section>
      ))}
    </div>
  )
}
