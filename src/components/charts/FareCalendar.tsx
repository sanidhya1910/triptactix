'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CalendarDaysIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { canonicalCity } from '@/lib/cities';

interface FareDay {
  date: string;
  predicted_price: number;
  day_of_week?: string;
  is_weekend?: boolean;
  level?: 'low' | 'medium' | 'high';
}

interface FareCalendarProps {
  sourceCity: string;
  destinationCity: string;
  travelClass?: string;
  daysAhead?: number;
  className?: string;
  onSelectDate?: (date: string, price: number) => void;
}

const ROUTE_BASE_PRICES: Record<string, number> = {
  'New Delhi-Mumbai': 5200, 'Mumbai-New Delhi': 5400, 'New Delhi-Bangalore': 6100,
  'Bangalore-New Delhi': 6300, 'New Delhi-Chennai': 6800, 'New Delhi-Kolkata': 5000,
  'Mumbai-Bangalore': 4500, 'Bangalore-Mumbai': 4600, 'Mumbai-Hyderabad': 4200,
  'Bangalore-Chennai': 3200, 'Chennai-Hyderabad': 4000,
};

function classMultiplier(travelClass?: string): number {
  return travelClass === 'business' || travelClass === 'first' ? 4.6
    : travelClass === 'premium' ? 1.6 : 1;
}

function tagLevels(days: FareDay[]): FareDay[] {
  if (days.length === 0) return days;
  const prices = days.map((d) => d.predicted_price);
  const lo = Math.min(...prices);
  const span = Math.max(Math.max(...prices) - lo, 1);
  return days.map((d) => {
    const frac = (d.predicted_price - lo) / span;
    return { ...d, level: frac <= 0.34 ? 'low' : frac <= 0.67 ? 'medium' : 'high' };
  });
}

function buildMockCalendar(src: string, dst: string, travelClass: string, daysAhead: number): FareDay[] {
  const routeKey = `${canonicalCity(src)}-${canonicalCity(dst)}`;
  const base = (ROUTE_BASE_PRICES[routeKey] || 5500) * classMultiplier(travelClass);
  const days: FareDay[] = [];
  const today = new Date();
  for (let i = 1; i <= daysAhead; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const weekend = isWeekend ? 0.1 : 0;
    const wave = Math.sin((i / 30) * Math.PI) * 0.06;
    const noise = (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.06 - 0.03;
    days.push({
      date: d.toISOString().split('T')[0],
      predicted_price: Math.round(base * (1 + weekend + wave + noise)),
      day_of_week: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dow],
      is_weekend: isWeekend,
    });
  }
  return tagLevels(days);
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const LEVEL_STYLE: Record<string, string> = {
  low: 'bg-green-50 border-green-200 hover:border-green-400',
  medium: 'bg-neutral-50 border-neutral-200 hover:border-neutral-400',
  high: 'bg-red-50 border-red-200 hover:border-red-300',
};
const PRICE_STYLE: Record<string, string> = {
  low: 'text-green-700', medium: 'text-neutral-600', high: 'text-red-700',
};

export default function FareCalendar({
  sourceCity, destinationCity, travelClass = 'economy', daysAhead = 60,
  className = '', onSelectDate,
}: FareCalendarProps) {
  const [days, setDays] = useState<FareDay[]>([]);
  const [cheapest, setCheapest] = useState<FareDay | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMock, setIsMock] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!sourceCity || !destinationCity) return;
      setLoading(true);
      setIsMock(false);
      try {
        const res = await fetch('/api/ml/fare-calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_city: sourceCity, destination_city: destinationCity,
            days_ahead: daysAhead, travel_class: travelClass,
          }),
          signal: AbortSignal.timeout(7000),
        });
        const data = await res.json();
        if (!res.ok || !data.success || !data.days?.length) throw new Error('no data');
        if (cancelled) return;
        setDays(data.days);
        setCheapest(data.cheapest);
      } catch {
        if (cancelled) return;
        const mock = buildMockCalendar(sourceCity, destinationCity, travelClass, daysAhead);
        setDays(mock);
        setCheapest(mock.reduce((a, b) => (b.predicted_price < a.predicted_price ? b : a), mock[0]));
        setIsMock(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [sourceCity, destinationCity, travelClass, daysAhead]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black" />
          <span className="text-sm text-neutral-600">Building fare calendar…</span>
        </CardContent>
      </Card>
    );
  }
  if (days.length === 0) return null;

  // Group into weeks aligned to Sun–Sat columns.
  const first = new Date(days[0].date);
  const lead = first.getDay();
  const cells: (FareDay | null)[] = [...Array(lead).fill(null), ...days];
  const weeks: (FareDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const prices = days.map((d) => d.predicted_price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDaysIcon className="w-5 h-5" />
          <span>Cheapest Days to Fly</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isMock && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <SparklesIcon className="w-4 h-4 shrink-0" />
            Estimated calendar (ML API offline).
          </div>
        )}

        {cheapest && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
            <div className="text-sm text-green-800">
              <span className="font-semibold">Cheapest:</span>{' '}
              {new Date(cheapest.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
            <div className="text-lg font-bold text-green-700">{fmt(cheapest.predicted_price)}</div>
          </div>
        )}

        <div>
          <div className="grid grid-cols-7 gap-1 mb-1 text-center text-[11px] font-medium text-neutral-500">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="space-y-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((cell, ci) => {
                  if (!cell) return <div key={ci} />;
                  const isCheapest = cheapest?.date === cell.date;
                  return (
                    <button
                      key={ci}
                      type="button"
                      onClick={() => onSelectDate?.(cell.date, cell.predicted_price)}
                      title={`${cell.day_of_week}, ${cell.date} — ${fmt(cell.predicted_price)}`}
                      className={`rounded-lg border p-1.5 text-left transition-colors ${LEVEL_STYLE[cell.level || 'medium']} ${isCheapest ? 'ring-2 ring-black' : ''}`}
                    >
                      <div className="text-xs font-semibold text-neutral-800">{new Date(cell.date).getDate()}</div>
                      <div className={`text-[10px] font-medium ${PRICE_STYLE[cell.level || 'medium']}`}>
                        {(cell.predicted_price / 1000).toFixed(1)}k
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-neutral-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-200 inline-block" /> Low</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-neutral-200 inline-block" /> Avg</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-200 inline-block" /> High</span>
          </div>
          <div className="text-neutral-600">
            Range <span className="font-semibold text-green-700">{fmt(min)}</span> – <span className="font-semibold text-red-700">{fmt(max)}</span> · Avg <span className="font-semibold">{fmt(avg)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
