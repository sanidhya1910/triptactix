import { canonicalCity } from '@/lib/cities';
import { daysBetween, todayISO } from '@/lib/dates';
import stats from '@/lib/ml/route-stats.json';

/**
 * Historical fare statistics for Indian domestic routes, from the 300,153 bookings in
 * data/Indian Airlines.csv, precomputed by scripts/build-route-stats.mjs.
 *
 * Everything here describes what fares *were*. Nothing predicts: forecasts come only
 * from the trained model behind ML_API_URL. This used to read the CSV with fs at import,
 * which never worked on Workers, and returned an invented ₹8,000 "prediction" for any
 * route without data. Both are gone; unknown routes now say so.
 */

interface Cell {
  count: number;
  sum: number;
  min: number;
  max: number;
}

interface RouteStats {
  from: string;
  to: string;
  class: string;
  all: Cell;
  durationSum: number;
  durationCount: number;
  byAirline: Record<string, Cell>;
  bySlot: Record<string, Cell>;
  byWindow: Record<string, Cell>;
  byDecade: Record<string, Cell>;
}

interface StatsFile {
  rows: number;
  airlines: Record<string, number>;
  routes: RouteStats[];
}

const data = stats as unknown as StatsFile;

/** Number of bookings the statistics are drawn from. */
export const HISTORICAL_ROWS = data.rows;

const avg = (c: Cell) => Math.round(c.sum / c.count);

const AIRLINE_NAMES: Record<string, string> = {
  Indigo: 'IndiGo',
  Air_India: 'Air India',
  SpiceJet: 'SpiceJet',
  AirAsia: 'AirAsia',
  Vistara: 'Vistara',
  GO_FIRST: 'Go First',
};
const airlineName = (raw: string) => AIRLINE_NAMES[raw] ?? raw;
const airlineKey = (name: string) =>
  Object.keys(AIRLINE_NAMES).find((k) => k.toLowerCase() === name.toLowerCase() || AIRLINE_NAMES[k].toLowerCase() === name.toLowerCase());

const SLOT_NAMES: Record<string, string> = {
  Early_Morning: 'Early morning (6:00 to 9:00)',
  Morning: 'Morning (9:00 to 12:00)',
  Afternoon: 'Afternoon (12:00 to 15:00)',
  Evening: 'Evening (15:00 to 18:00)',
  Night: 'Night (18:00 to 21:00)',
  Late_Night: 'Late night (21:00 to 6:00)',
};
const slotName = (raw: string) => SLOT_NAMES[raw] ?? raw;

const WINDOW_ORDER = ['0-7 days', '8-21 days', '22-45 days', '46-60 days', '60+ days'];
const windowOf = (daysLeft: number) =>
  daysLeft <= 7 ? '0-7 days' : daysLeft <= 21 ? '8-21 days' : daysLeft <= 45 ? '22-45 days' : daysLeft <= 60 ? '46-60 days' : '60+ days';

const index = new Map(data.routes.map((r) => [`${canonicalCity(r.from)}|${canonicalCity(r.to)}|${r.class}`, r]));

function routeStats(from: string, to: string, travelClass = 'economy'): RouteStats | undefined {
  const cls = travelClass.toLowerCase() === 'business' || travelClass.toLowerCase() === 'first' ? 'business' : 'economy';
  return index.get(`${canonicalCity(from)}|${canonicalCity(to)}|${cls}`);
}

export const routeLabel = (from: string, to: string) => `${canonicalCity(from)} → ${canonicalCity(to)}`;

// ---- Public types -------------------------------------------------------------

export interface HistoricalRange {
  route: string;
  travelClass: string;
  bookings: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  /** Average for bookings made this many days ahead, when the date is known. */
  window?: { label: string; averagePrice: number; bookings: number };
}

export interface RouteAnalytics {
  route: string;
  totalFlights: number;
  airlines: string[];
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  averageDuration: number;
  mostCommonAirline: string;
  bestTimeToBook: string;
  popularTimeSlots: string[];
}

export interface RouteIntelligence {
  route: string;
  totalFlights: number;
  airlinePositioning: Array<{ airline: string; avgPrice: number; minPrice: number; count: number }>;
  timeSlotPricing: Array<{ slot: string; avgPrice: number; count: number }>;
  bookingWindow: Array<{ bucket: string; avgPrice: number }>;
  cheapestAirline: string;
  cheapestTimeSlot: string;
  cheapestBookingWindow: string;
}

export interface PriceRecommendations {
  route: string;
  bestPrice: number;
  worstPrice: number;
  averagePrice: number;
  recommendedBookingWindow: string;
  priceHistory: Array<{ daysLeft: number; averagePrice: number }>;
}

// ---- Queries --------------------------------------------------------------------

/**
 * What this route has historically cost, optionally for an airline and for how far
 * ahead `departureDate` is. Null when there is no history for the route.
 */
export function historicalRange(
  from: string,
  to: string,
  opts: { departureDate?: string; airline?: string; travelClass?: string } = {},
): HistoricalRange | null {
  const r = routeStats(from, to, opts.travelClass);
  if (!r) return null;
  const key = opts.airline ? airlineKey(opts.airline) : undefined;
  const c = (key && r.byAirline[key]) || r.all;

  const out: HistoricalRange = {
    route: routeLabel(from, to),
    travelClass: r.class,
    bookings: c.count,
    averagePrice: avg(c),
    minPrice: c.min,
    maxPrice: c.max,
  };
  if (opts.departureDate) {
    const label = windowOf(Math.max(0, daysBetween(todayISO(), opts.departureDate)));
    const w = r.byWindow[label];
    if (w) out.window = { label, averagePrice: avg(w), bookings: w.count };
  }
  return out;
}

export function getRouteAnalytics(from: string, to: string): RouteAnalytics | null {
  const r = routeStats(from, to);
  if (!r) return null;
  const airlines = Object.entries(r.byAirline).sort(([, a], [, b]) => b.count - a.count);
  const windows = Object.entries(r.byWindow).sort(([, a], [, b]) => avg(a) - avg(b));
  const slots = Object.entries(r.bySlot).sort(([, a], [, b]) => b.count - a.count);
  return {
    route: routeLabel(from, to),
    totalFlights: r.all.count,
    airlines: airlines.map(([a]) => airlineName(a)),
    averagePrice: avg(r.all),
    minPrice: r.all.min,
    maxPrice: r.all.max,
    averageDuration: r.durationCount ? Math.round(r.durationSum / r.durationCount) : 0,
    mostCommonAirline: airlines[0] ? airlineName(airlines[0][0]) : '',
    bestTimeToBook: windows[0]?.[0] ?? '',
    popularTimeSlots: slots.slice(0, 3).map(([s]) => slotName(s)),
  };
}

export function getRouteIntelligence(from: string, to: string): RouteIntelligence | null {
  const r = routeStats(from, to);
  if (!r) return null;
  const airlinePositioning = Object.entries(r.byAirline)
    .map(([a, c]) => ({ airline: airlineName(a), avgPrice: avg(c), minPrice: c.min, count: c.count }))
    .sort((a, b) => a.avgPrice - b.avgPrice);
  const timeSlotPricing = Object.entries(r.bySlot)
    .map(([s, c]) => ({ slot: slotName(s), avgPrice: avg(c), count: c.count }))
    .sort((a, b) => a.avgPrice - b.avgPrice);
  const bookingWindow = WINDOW_ORDER.filter((w) => r.byWindow[w]).map((w) => ({ bucket: w, avgPrice: avg(r.byWindow[w]) }));
  return {
    route: routeLabel(from, to),
    totalFlights: r.all.count,
    airlinePositioning,
    timeSlotPricing,
    bookingWindow,
    cheapestAirline: airlinePositioning[0]?.airline ?? '',
    cheapestTimeSlot: timeSlotPricing[0]?.slot ?? '',
    cheapestBookingWindow: [...bookingWindow].sort((a, b) => a.avgPrice - b.avgPrice)[0]?.bucket ?? '',
  };
}

const bookingWindowText = (daysLeft: number) =>
  daysLeft >= 60
    ? '60 or more days before departure'
    : daysLeft >= 40
      ? '40 to 60 days before departure'
      : daysLeft >= 20
        ? '20 to 40 days before departure'
        : daysLeft >= 10
          ? '10 to 20 days before departure'
          : 'Less than 10 days before departure';

export function getPriceRecommendations(from: string, to: string): PriceRecommendations | null {
  const r = routeStats(from, to);
  if (!r) return null;
  const priceHistory = Object.entries(r.byDecade)
    .map(([d, c]) => ({ daysLeft: Number(d), averagePrice: avg(c) }))
    .sort((a, b) => b.daysLeft - a.daysLeft);
  const best = [...priceHistory].sort((a, b) => a.averagePrice - b.averagePrice)[0];
  return {
    route: routeLabel(from, to),
    bestPrice: r.all.min,
    worstPrice: r.all.max,
    averagePrice: avg(r.all),
    recommendedBookingWindow: bookingWindowText(best?.daysLeft ?? 30),
    priceHistory,
  };
}

/** Routes with history, busiest first. Economy and business are counted together. */
export function getAvailableRoutes(): Array<{ from: string; to: string; flightCount: number }> {
  const counts = new Map<string, number>();
  for (const r of data.routes) {
    const k = `${canonicalCity(r.from)}|${canonicalCity(r.to)}`;
    counts.set(k, (counts.get(k) ?? 0) + r.all.count);
  }
  return [...counts.entries()]
    .map(([k, flightCount]) => {
      const [from, to] = k.split('|');
      return { from, to, flightCount };
    })
    .sort((a, b) => b.flightCount - a.flightCount);
}

export function getDashboardInsights() {
  const routes = getAvailableRoutes();
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const r of data.routes) {
    sum += r.all.sum;
    min = Math.min(min, r.all.min);
    max = Math.max(max, r.all.max);
  }
  const topAirlines = Object.entries(data.airlines)
    .map(([a, n]) => ({ airline: airlineName(a), marketShare: Math.round((n / data.rows) * 100) }))
    .sort((a, b) => b.marketShare - a.marketShare)
    .slice(0, 5);
  return {
    totalRoutes: routes.length,
    totalFlights: data.rows,
    mostPopularRoute: routes[0] ? `${routes[0].from} → ${routes[0].to}` : '',
    averagePriceAcrossRoutes: Math.round(sum / data.rows),
    priceRangeAcrossRoutes: { min, max },
    topAirlines,
  };
}

export interface FlightHistoryInsight {
  /** Always historical: how this fare compares with past bookings on the route. */
  source: 'historical';
  category: 'Low for this route' | 'Below average' | 'About average' | 'Above average' | 'High for this route';
  /** Percent above (positive) or below (negative) the historical average. */
  comparedToAverage: number;
  historicalAverage: number;
  bookings: number;
}

/**
 * Compares each fare with what the route has historically cost. This is a comparison,
 * not a prediction, and is labelled as one; flights on routes with no history are
 * returned unchanged.
 */
export function enhanceSearchResults<T>(
  flights: T[],
  priceOf: (flight: T) => number,
  from: string,
  to: string,
  departureDate: string,
  travelClass = 'economy',
): Array<T & { historyInsight?: FlightHistoryInsight }> {
  const range = historicalRange(from, to, { departureDate, travelClass });
  if (!range) return flights as Array<T & { historyInsight?: FlightHistoryInsight }>;
  const reference = range.window?.averagePrice ?? range.averagePrice;
  return flights.map((f) => {
    const price = priceOf(f);
    if (!(price > 0)) return f as T & { historyInsight?: FlightHistoryInsight };
    const diff = Math.round(((price - reference) / reference) * 100);
    const category: FlightHistoryInsight['category'] =
      price <= range.minPrice * 1.1
        ? 'Low for this route'
        : diff <= -10
          ? 'Below average'
          : diff <= 10
            ? 'About average'
            : price >= range.maxPrice * 0.9
              ? 'High for this route'
              : 'Above average';
    return {
      ...f,
      historyInsight: { source: 'historical', category, comparedToAverage: diff, historicalAverage: reference, bookings: range.window?.bookings ?? range.bookings },
    };
  });
}
