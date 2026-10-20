import { ArrowRight, Warning } from '@phosphor-icons/react/ssr'
import {
  balances,
  budgetStatus,
  costByKind,
  formatINR,
  hasSubsets,
  perPerson,
  settleUp,
  sumItems,
  totalCost,
  unassigned,
} from '@/lib/planner/calc'
import { KINDS } from '@/lib/planner/types'
import type { ItemKind, Trip } from '@/lib/planner/types'
import { useActiveTrip, useTrip } from '@/lib/planner/store'
import { cn } from '@/lib/utils'
import { dayAnchor } from './DayCard'
import { KindIcon } from './kinds'
import { SHARED_ANCHOR } from './SharedCosts'

const mono = 'font-mono [font-variant-numeric:tabular-nums]'

export const SUMMARY_ANCHOR = 'trip-summary'

const nameOf = (trip: Trip, id: string) => trip.people.find((p) => p.id === id)?.name || 'Unnamed traveller'

export function Summary({ className }: { className?: string }) {
  const trip = useActiveTrip()
  const total = totalCost(trip)
  const each = perPerson(trip)
  const split = costByKind(trip)
  const budget = budgetStatus(trip)
  const n = trip.people.length

  // Largest first, and only what has money in it: a row of zeros is noise.
  const ranked = (Object.keys(split) as ItemKind[]).filter((k) => split[k] > 0).sort((a, b) => split[b] - split[a])

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
          <span className={cn(mono, 'text-ink')}>{formatINR(each)}</span>{' '}
          {hasSubsets(trip) ? 'per person on average' : 'per person'}, {n} {n === 1 ? 'traveller' : 'travellers'}
        </div>
      </div>

      {budget && <BudgetBlock trip={trip} />}

      {n > 1 && <SettleUp trip={trip} />}

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
                    <span className={cn(mono, 'w-10 text-right text-xs text-ink-tertiary')}>{Math.round(share * 100)}%</span>
                  </div>
                  <div aria-hidden className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-sunken">
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
            <JumpLink key={d.id} href={`#${dayAnchor(d.id)}`} label={`Day ${i + 1}`} detail={d.title} amount={sumItems(d.items)} />
          ))}
        </ul>
      </nav>
    </aside>
  )
}

function BudgetBlock({ trip }: { trip: Trip }) {
  const b = budgetStatus(trip)!
  const multi = trip.people.length > 1
  return (
    <div className="border-t border-line p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Budget</h2>
        <span className={cn(mono, 'text-sm text-ink-secondary')}>{formatINR(b.budget)}</span>
      </div>
      <div
        role="meter"
        aria-label="Budget used"
        aria-valuemin={0}
        aria-valuemax={b.budget}
        aria-valuenow={Math.min(b.spent, b.budget)}
        aria-valuetext={`${Math.round(b.used * 100)}% used`}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
      >
        <div
          className={cn('h-full rounded-full', b.over ? 'bg-neg-fg' : 'bg-brand')}
          style={{ width: `${Math.min(100, Math.max(b.used * 100, 1))}%` }}
        />
      </div>
      <p className={cn('mt-2.5 text-sm', b.over ? 'text-neg-fg' : 'text-pos-fg')}>
        <span className={mono}>{formatINR(Math.abs(b.remaining))}</span> {b.over ? 'over budget' : 'left'}
        {multi && (
          <span className="text-ink-tertiary">
            {' '}
            · <span className={mono}>{formatINR(Math.abs(b.perPersonRemaining))}</span> each
          </span>
        )}
      </p>
    </div>
  )
}

/** Who owes whom, worked out from who paid what and who shares each cost. */
function SettleUp({ trip }: { trip: Trip }) {
  const bal = balances(trip)
  const transfers = settleUp(trip)
  const missing = unassigned(trip)
  const anyPaid = Object.values(bal).some((v) => v !== 0)

  return (
    <div className="border-t border-line p-5">
      <h2 className="text-sm font-semibold text-ink">Settle up</h2>

      {missing.count > 0 && (
        <p className="mt-3 flex gap-2 rounded-md bg-caution px-3 py-2 text-xs text-caution-fg">
          <Warning aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" weight="bold" />
          <span>
            {missing.count} {missing.count === 1 ? 'cost' : 'costs'} worth{' '}
            <span className={mono}>{formatINR(missing.amount)}</span> {missing.count === 1 ? 'has' : 'have'} no payer yet, so{' '}
            {missing.count === 1 ? 'it is' : 'they are'} left out below. Choose who paid from each cost’s menu.
          </span>
        </p>
      )}

      {!anyPaid ? (
        <p className="mt-3 text-sm text-ink-tertiary">Say who paid for each cost to see who owes whom.</p>
      ) : transfers.length === 0 ? (
        <p className="mt-3 text-sm text-pos-fg">Everyone is square.</p>
      ) : (
        <ul className="mt-3 space-y-2" aria-label="Payments that settle the trip">
          {transfers.map((t) => (
            <li key={`${t.from}-${t.to}`} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 truncate text-ink">{nameOf(trip, t.from)}</span>
              <ArrowRight aria-label="pays" className="h-3.5 w-3.5 shrink-0 text-ink-tertiary" weight="bold" />
              <span className="min-w-0 flex-1 truncate text-ink">{nameOf(trip, t.to)}</span>
              <span className={cn(mono, 'shrink-0 text-ink')}>{formatINR(t.amount)}</span>
            </li>
          ))}
        </ul>
      )}

      {anyPaid && (
        <details className="mt-3 group">
          <summary className="cursor-pointer text-xs text-ink-secondary hover:text-ink">Balances</summary>
          <ul className="mt-2 space-y-1">
            {trip.people.map((p) => {
              const v = bal[p.id]
              return (
                <li key={p.id} className="flex justify-between gap-3 text-xs">
                  <span className="truncate text-ink-secondary">{p.name || 'Unnamed traveller'}</span>
                  <span className={cn(mono, v > 0 ? 'text-pos-fg' : v < 0 ? 'text-neg-fg' : 'text-ink-tertiary')}>
                    {v > 0 ? `gets back ${formatINR(v)}` : v < 0 ? `owes ${formatINR(-v)}` : 'square'}
                  </span>
                </li>
              )
            })}
          </ul>
        </details>
      )}
    </div>
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
  const trip = useActiveTrip()
  const hidden = useTrip((s) => s.toast !== null)
  const budget = budgetStatus(trip)
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
        {budget ? (
          <span className="text-right">
            <span className="block text-xs text-ink-secondary">{budget.over ? 'Over budget' : 'Left'}</span>
            <span className={cn(mono, 'text-lg', budget.over ? 'text-neg-fg' : 'text-pos-fg')}>
              {formatINR(Math.abs(budget.remaining))}
            </span>
          </span>
        ) : (
          <span className="text-right">
            <span className="block text-xs text-ink-secondary">Per person</span>
            <span className={cn(mono, 'text-lg text-ink')}>{formatINR(perPerson(trip))}</span>
          </span>
        )}
        <span className="text-xs font-medium text-brand">Summary</span>
      </a>
    </div>
  )
}
