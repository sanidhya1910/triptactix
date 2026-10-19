import { costByKind, formatINR } from '@/lib/planner/calc'
import { KINDS, SPLIT_ORDER } from '@/lib/planner/types'
import { useTrip } from '@/lib/planner/store'
import { KindDot } from './ui'

export function CostSplit() {
  const trip = useTrip((s) => s.trip)
  const split = costByKind(trip)
  return (
    <div className="tp-no-print border-b-2 border-tp-line bg-tp-surface2 px-4 py-3 lg:px-8">
      <ul className="mx-auto flex max-w-[1500px] flex-wrap gap-x-7 gap-y-2" aria-label="Cost split">
        {SPLIT_ORDER.map((k) => (
          <li key={k} className="flex items-center gap-2 text-base">
            <KindDot kind={k} size={12} />
            <span className="font-semibold">{KINDS[k].split}</span>
            <span className="font-bold tabular-nums">{formatINR(split[k])}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
