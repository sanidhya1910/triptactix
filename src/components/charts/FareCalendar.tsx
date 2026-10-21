'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarBlank } from '@phosphor-icons/react/ssr';
import { parseISODate } from '@/lib/dates';
import { cn } from '@/lib/utils';

interface FareDay {
  date: string;
  predicted_price: number;
  level?: 'low' | 'medium' | 'high';
}

interface FareCalendarProps {
  sourceCity: string;
  destinationCity: string;
  travelClass?: string;
  daysAhead?: number;
  className?: string;
  /** The day that was searched, outlined in the grid. */
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
}

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const LEVEL_STYLE: Record<string, string> = {
  low: 'bg-pos border-pos-fg/25',
  medium: 'bg-surface-sunken border-line',
  high: 'bg-neg border-neg-fg/25',
};
const PRICE_STYLE: Record<string, string> = { low: 'text-pos-fg', medium: 'text-ink-secondary', high: 'text-neg-fg' };

/** Thirds of the range, so colour means cheaper or dearer than the rest of these days. */
function withLevels(days: FareDay[]): FareDay[] {
  const prices = days.map((d) => d.predicted_price);
  const lo = Math.min(...prices);
  const span = Math.max(Math.max(...prices) - lo, 1);
  return days.map((d) => {
    const f = (d.predicted_price - lo) / span;
    return { ...d, level: f <= 1 / 3 ? 'low' : f <= 2 / 3 ? 'medium' : 'high' };
  });
}

/**
 * The model's forecast for each of the next days. Shown only when the model answers:
 * this used to draw a sine wave around a hardcoded base fare when it did not, which read
 * as a forecast despite a small "estimated" note. When the model is not connected this
 * renders nothing; the route panel above says so once, for the whole page.
 */
export default function FareCalendar({
  sourceCity,
  destinationCity,
  travelClass = 'economy',
  daysAhead = 60,
  className,
  selectedDate,
  onSelectDate,
}: FareCalendarProps) {
  const [days, setDays] = useState<FareDay[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setDays(null);
    fetch('/api/ml/fare-calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_city: sourceCity, destination_city: destinationCity, days_ahead: daysAhead, travel_class: travelClass }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const valid = Array.isArray(data?.days)
          ? (data.days as FareDay[]).filter((d) => parseISODate(d.date) && Number.isFinite(d.predicted_price))
          : [];
        setDays(valid.length ? withLevels(valid) : []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setDays([]);
      });
    return () => controller.abort();
  }, [sourceCity, destinationCity, travelClass, daysAhead]);

  if (!days || days.length === 0) return null;

  const cheapest = days.reduce((a, b) => (b.predicted_price < a.predicted_price ? b : a));
  const lead = parseISODate(days[0].date)!.getDay();
  const cells: (FareDay | null)[] = [...Array(lead).fill(null), ...days];
  const weeks: (FareDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const label = (iso: string) =>
    parseISODate(iso)!.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle as="h3" className="flex items-center gap-2">
          <CalendarBlank className="h-5 w-5" />
          Forecast fares by day
        </CardTitle>
        <p className="text-sm text-ink-secondary">
          The model’s forecast for each of the next {days.length} days. Cheapest:{' '}
          <span className="font-medium text-pos-fg">
            {label(cheapest.date)}, {fmt(cheapest.predicted_price)}
          </span>
          . {onSelectDate && 'Choose a day to search it.'}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-ink-tertiary" aria-hidden>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="space-y-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((cell, ci) =>
                !cell ? (
                  <div key={ci} />
                ) : (
                  <button
                    key={cell.date}
                    type="button"
                    disabled={!onSelectDate}
                    onClick={() => onSelectDate?.(cell.date)}
                    aria-label={`${label(cell.date)}, forecast ${fmt(cell.predicted_price)}${cell.date === cheapest.date ? ', cheapest' : ''}`}
                    aria-current={cell.date === selectedDate ? 'date' : undefined}
                    className={cn(
                      'rounded-md border p-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand enabled:hover:border-ink/30 disabled:cursor-default',
                      LEVEL_STYLE[cell.level ?? 'medium'],
                      cell.date === selectedDate && 'ring-2 ring-ink',
                    )}
                  >
                    <div className="text-xs font-semibold text-ink">{parseISODate(cell.date)!.getDate()}</div>
                    <div className={cn('font-mono text-[10px]', PRICE_STYLE[cell.level ?? 'medium'])}>
                      {(cell.predicted_price / 1000).toFixed(1)}k
                    </div>
                  </button>
                ),
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-ink-tertiary" aria-hidden>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm border border-pos-fg/25 bg-pos" /> Cheaper
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm border border-line bg-surface-sunken" /> Typical
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm border border-neg-fg/25 bg-neg" /> Dearer
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
