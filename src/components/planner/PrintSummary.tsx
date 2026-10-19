import { costByKind, dayDate, formatINR, perPerson, sumItems, totalCost } from '@/lib/planner/calc'
import type { Item } from '@/lib/planner/types'
import { KINDS, SPLIT_ORDER } from '@/lib/planner/types'
import { useTrip } from '@/lib/planner/store'

function Rows({ items }: { items: Item[] }) {
  return (
    <ul style={{ margin: '4px 0 12px', paddingLeft: 0, listStyle: 'none' }}>
      {items.map((i) => (
        <li key={i.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '3px 0', borderBottom: '1px solid #ccc' }}>
          <span>
            {i.title || KINDS[i.kind].label}
            {i.note && <em style={{ display: 'block', fontSize: 13 }}>{i.note}</em>}
          </span>
          <span>{i.amount ? formatINR(i.amount) : ''}</span>
        </li>
      ))}
    </ul>
  )
}

/** Only visible when printing. */
export function PrintSummary() {
  const trip = useTrip((s) => s.trip)
  const split = costByKind(trip)
  return (
    <div className="tp-print-only" style={{ fontSize: 15, padding: 8 }}>
      <h1 style={{ fontSize: 30, fontWeight: 700 }}>{trip.title}</h1>
      <p>
        Starts {dayDate(trip.startDate, 0)} · {trip.travellers} travellers
      </p>
      <p style={{ fontSize: 20, fontWeight: 700, margin: '8px 0' }}>
        Total {formatINR(totalCost(trip))} · {formatINR(perPerson(trip))} per person
      </p>
      <p>{SPLIT_ORDER.filter((k) => split[k] > 0).map((k) => `${KINDS[k].split} ${formatINR(split[k])}`).join(' · ')}</p>
      {trip.notes && <p style={{ whiteSpace: 'pre-wrap', margin: '10px 0' }}>{trip.notes}</p>}
      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 16 }}>Whole trip · {formatINR(sumItems(trip.wholeTrip))}</h2>
      <Rows items={trip.wholeTrip} />
      {trip.days.map((d, i) => (
        <div key={d.id} style={{ breakInside: 'avoid' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 16 }}>
            Day {i + 1} {dayDate(trip.startDate, i)} {d.title && `· ${d.title}`} · {formatINR(sumItems(d.items))}
          </h2>
          {d.notes && <p style={{ whiteSpace: 'pre-wrap' }}>{d.notes}</p>}
          <Rows items={d.items} />
        </div>
      ))}
    </div>
  )
}
