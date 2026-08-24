'use client';

/**
 * Client-side persistence for saved trips, recent searches and price-alert
 * watches. Uses localStorage so it works without auth; the production upgrade
 * path is to move these to the D1/Prisma database keyed by user, with a cron
 * job that re-checks alerts server-side and emails/pushes the user.
 */

const KEYS = {
  trips: 'tt_saved_trips',
  searches: 'tt_recent_searches',
  alerts: 'tt_price_alerts',
} as const;

export interface SavedTrip {
  id: string;
  destination: string;
  flightSource?: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budget: string;
  totalCost?: number;
  savedAt: string;
  itinerary?: unknown; // full GeneratedItinerary snapshot
}

export interface RecentSearch {
  id: string;
  origin: string;
  destination: string;
  departureDate: string;
  travelClass: string;
  lowestPrice?: number;
  searchedAt: string;
}

export interface PriceAlert {
  id: string;
  origin: string;
  destination: string;
  departureDate: string;
  travelClass: string;
  targetPrice: number;
  createdAt: string;
  lastChecked?: string;
  lastPrice?: number;
  triggered?: boolean;
}

function read<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(key) || '[]') as T[];
  } catch {
    return [];
  }
}

function write<T>(key: string, items: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
    window.dispatchEvent(new Event('tt-storage'));
  } catch {
    /* quota / disabled storage, ignore */
  }
}

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ---- Saved trips -----------------------------------------------------------
export const getTrips = () => read<SavedTrip>(KEYS.trips);

export function saveTrip(trip: Omit<SavedTrip, 'id' | 'savedAt'>): SavedTrip {
  const items = getTrips();
  const entry: SavedTrip = { ...trip, id: uid(), savedAt: new Date().toISOString() };
  write(KEYS.trips, [entry, ...items].slice(0, 50));
  return entry;
}

export const removeTrip = (id: string) =>
  write(KEYS.trips, getTrips().filter((t) => t.id !== id));

// ---- Recent searches -------------------------------------------------------
export const getRecentSearches = () => read<RecentSearch>(KEYS.searches);

export function recordSearch(search: Omit<RecentSearch, 'id' | 'searchedAt'>): void {
  const items = getRecentSearches().filter(
    (s) => !(s.origin === search.origin && s.destination === search.destination &&
             s.departureDate === search.departureDate));
  write(KEYS.searches, [{ ...search, id: uid(), searchedAt: new Date().toISOString() }, ...items].slice(0, 15));
}

// ---- Price alerts ----------------------------------------------------------
export const getAlerts = () => read<PriceAlert>(KEYS.alerts);

export function addAlert(alert: Omit<PriceAlert, 'id' | 'createdAt'>): PriceAlert {
  const entry: PriceAlert = { ...alert, id: uid(), createdAt: new Date().toISOString() };
  write(KEYS.alerts, [entry, ...getAlerts()].slice(0, 50));
  return entry;
}

export const removeAlert = (id: string) =>
  write(KEYS.alerts, getAlerts().filter((a) => a.id !== id));

export function updateAlert(id: string, patch: Partial<PriceAlert>): void {
  write(KEYS.alerts, getAlerts().map((a) => (a.id === id ? { ...a, ...patch } : a)));
}

/** Re-check one alert against the live ML prediction; marks it triggered if at/below target. */
export async function checkAlert(alert: PriceAlert): Promise<PriceAlert> {
  try {
    const params = new URLSearchParams({
      from: alert.origin, to: alert.destination, departureDate: alert.departureDate,
    });
    const res = await fetch(`/api/ml/predictions?${params}`);
    const data = await res.json();
    const price = typeof data?.predictedPrice === 'number' ? data.predictedPrice : undefined;
    const patch: Partial<PriceAlert> = {
      lastChecked: new Date().toISOString(),
      lastPrice: price,
      triggered: price !== undefined ? price <= alert.targetPrice : alert.triggered,
    };
    updateAlert(alert.id, patch);
    return { ...alert, ...patch };
  } catch {
    updateAlert(alert.id, { lastChecked: new Date().toISOString() });
    return { ...alert, lastChecked: new Date().toISOString() };
  }
}
