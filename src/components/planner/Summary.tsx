import { costByKind, formatINR, perPerson, sumItems, totalCost } from '@/lib/planner/calc'
import { KINDS } from '@/lib/planner/types'
import type { ItemKind } from '@/lib/planner/types'
import { useTrip } from '@/lib/planner/store'
import { cn } from '@/lib/utils'
import { dayAnchor } from './DayCard'
import { KindIcon } from './kinds'
import { SHARED_ANCHOR } from './SharedCosts'

const mono = 'font-mono [font-variant-numeric:tabular-nums]'

export const SUMMARY_ANCHOR = 'trip-summary'

export function Summary({ className }: { className?: string }) {
  const trip = useTrip((s) => s.trip)
  const total = totalCost(trip)
  const each = perPerson(trip)
  const split = costByKind(trip)

  // Largest first, and only what has money in it: a row of zeros is noise.
  const ranked = (Object.keys(split) as ItemKind[])
    .filter((k) => split[k] > 0)
    .sort((a, b) => split[b] - split[a])

  return (
    <aside
      id={SUMMARY_ANCHOR}
      aria-label="Trip summary"
      className={cn(
        'scroll-mt-24 rounded-lg border border-line bg-surface lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto',
        className,
      )}
    >
      <div className="p-5">
        <div className="text-sm text-ink-secondary">Total</div>
        <div aria-live="polite" className={cn(mono, 'mt-1 text-4xl tracking-[-0.02em] text-ink')}>
          {formatINR(total)}
        </div>
        <div className="mt-1.5 text-sm text-ink-secondary">
          <span className={cn(mono, 'text-ink')}>{formatINR(each)}</span> per person, {trip.travellers}{' '}
          {trip.travellers === 1 ? 'traveller' : 'travellers'}
        </div>
      </div>

      <div className="border-t border-line p-5">
        <h2 className="text-sm font-semibold text-ink">Where it goes</h2>
        {ranked.length === 0 ? (
          <p className="mt-3 text-sm text-ink-tertiary">Add a cost to see the breakdown.</p>
        ) : (
          <ul className="mt-4 space-y-3.5">
            {ranked.map((k) => {
              const share = total > 0 ? split[k] / total : 0
              return (
                <li key={k}>
                  <div className="flex items-center gap-2 text-sm">
                    <KindIcon kind={k} className="text-ink-tertiary" />
                    <span className="flex-1 text-ink">{KINDS[k].split}</span>
                    <span className={cn(mono, 'text-ink')}>{formatINR(split[k])}</span>
                    <span className={cn(mono, 'w-10 text-right text-xs text-ink-tertiary')}>
                      {Math.round(share * 100)}%
                    </span>
                  </div>
                  <div
                    aria-hidden
                    className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-sunken"
                  >
                    <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(share * 100, 1)}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <nav aria-label="Jump to" className="border-t border-line p-3">
        <ul className="space-y-0.5">
          <JumpLink href={`#${SHARED_ANCHOR}`} label="Shared costs" amount={sumItems(trip.wholeTrip)} />
          {trip.days.map((d, i) => (
            <JumpLink
              key={d.id}
              href={`#${dayAnchor(d.id)}`}
              label={`Day ${i + 1}`}
              detail={d.title}
              amount={sumItems(d.items)}
            />
          ))}
        </ul>
      </nav>
    </aside>
  )
}

function JumpLink({ href, label, detail, amount }: { href: string; label: string; detail?: string; amount: number }) {
  return (
    <li>
      <a
        href={href}
        className="flex items-baseline gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <span className="shrink-0 text-ink">{label}</span>
        <span className="min-w-0 flex-1 truncate text-ink-tertiary">{detail}</span>
        <span className={cn(mono, 'shrink-0 text-ink-secondary')}>{formatINR(amount)}</span>
      </a>
    </li>
  )
}

/**
 * On phones the summary sits below the days, so the running total is pinned here
 * instead: editing a cost on Day 4 should not mean scrolling away to see the effect.
 */
export function MobileTotalBar() {
  const trip = useTrip((s) => s.trip)
  const hidden = useTrip((s) => s.toast !== null)
  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-5 py-3 backdrop-blur transition-transform duration-200 lg:hidden',
        // Step aside while a toast is up, since both occupy the bottom of a phone screen.
        hidden && 'translate-y-full',
      )}
    >
      <a href={`#${SUMMARY_ANCHOR}`} className="flex items-center justify-between gap-4">
        <span>
          <span className="block text-xs text-ink-secondary">Total</span>
          <span className={cn(mono, 'text-lg text-ink')}>{formatINR(totalCost(trip))}</span>
        </span>
        <span className="text-right">
          <span className="block text-xs text-ink-secondary">Per person</span>
          <span className={cn(mono, 'text-lg text-ink')}>{formatINR(perPerson(trip))}</span>
        </span>
        <span className="text-xs font-medium text-brand">Breakdown</span>
      </a>
    </div>
  )
}
