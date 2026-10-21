'use client';

/**
 * Client-side persistence for saved trips, recent searches and price-alert
 * watches. Uses localStorage so it works without auth; the production upgrade
 * path is to move these to the D1 database keyed by user, with a cron job that
 * re-checks alerts server-side and emails or pushes the user.
 */

import {
  isFiniteNumber,
  isOptional,
  isRecord,
  isString,
  readList,
  removeKey,
  subscribeToStorage,
  writeJSON,
} from '@/lib/storage';
import { todayISO } from '@/lib/dates';
import { useMemo, useSyncExternalStore } from 'react';

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

// ---- Validation -------------------------------------------------------------
// One malformed entry is dropped on read instead of crashing the dashboard.
const isSavedTrip = (v: unknown): v is SavedTrip =>
  isRecord(v) &&
  isString(v.id) &&
  isString(v.destination) &&
  isString(v.startDate) &&
  isString(v.endDate) &&
  isFiniteNumber(v.travelers) &&
  isString(v.budget) &&
  isString(v.savedAt) &&
  isOptional(isString)(v.flightSource) &&
  isOptional(isFiniteNumber)(v.totalCost);

const isRecentSearch = (v: unknown): v is RecentSearch =>
  isRecord(v) &&
  isString(v.id) &&
  isString(v.origin) &&
  isString(v.destination) &&
  isString(v.departureDate) &&
  isString(v.travelClass) &&
  isString(v.searchedAt) &&
  isOptional(isFiniteNumber)(v.lowestPrice);

const isPriceAlert = (v: unknown): v is PriceAlert =>
  isRecord(v) &&
  isString(v.id) &&
  isString(v.origin) &&
  isString(v.destination) &&
  isString(v.departureDate) &&
  isString(v.travelClass) &&
  isFiniteNumber(v.targetPrice) &&
  isString(v.createdAt) &&
  isOptional(isString)(v.lastChecked) &&
  isOptional(isFiniteNumber)(v.lastPrice) &&
  isOptional((x): x is boolean => typeof x === 'boolean')(v.triggered);

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const now = () => new Date().toISOString();

// ---- Saved trips -----------------------------------------------------------
export const getTrips = () => readList(KEYS.trips, isSavedTrip);

export const getTrip = (id: string) => getTrips().find((t) => t.id === id);

/** Returns the saved entry, or null when the browser refused the write (e.g. storage full). */
export function saveTrip(trip: Omit<SavedTrip, 'id' | 'savedAt'>): SavedTrip | null {
  const entry: SavedTrip = { ...trip, id: uid(), savedAt: now() };
  return writeJSON(KEYS.trips, [entry, ...getTrips()].slice(0, 50)) ? entry : null;
}

export const removeTrip = (id: string) => writeJSON(KEYS.trips, getTrips().filter((t) => t.id !== id));

/** Puts a removed trip back, for undo. */
export const restoreTrip = (trip: SavedTrip) =>
  writeJSON(KEYS.trips, [trip, ...getTrips().filter((t) => t.id !== trip.id)].slice(0, 50));

// ---- Recent searches -------------------------------------------------------
export const getRecentSearches = () => readList(KEYS.searches, isRecentSearch);

export function recordSearch(search: Omit<RecentSearch, 'id' | 'searchedAt'>): void {
  const items = getRecentSearches().filter(
    (s) =>
      !(s.origin === search.origin && s.destination === search.destination && s.departureDate === search.departureDate),
  );
  writeJSON(KEYS.searches, [{ ...search, id: uid(), searchedAt: now() }, ...items].slice(0, 15));
}

export const clearRecentSearches = () => removeKey(KEYS.searches);

// ---- Price alerts ----------------------------------------------------------
export const getAlerts = () => readList(KEYS.alerts, isPriceAlert);

const sameWatch = (a: Pick<PriceAlert, 'origin' | 'destination' | 'departureDate' | 'travelClass'>, b: typeof a) =>
  a.origin === b.origin && a.destination === b.destination && a.departureDate === b.departureDate && a.travelClass === b.travelClass;

export type AddAlertResult =
  | { status: 'added'; alert: PriceAlert }
  | { status: 'duplicate'; alert: PriceAlert }
  | { status: 'failed' };

/** Adds an alert unless the same route, date and class is already being watched. */
export function addAlert(alert: Omit<PriceAlert, 'id' | 'createdAt'>): AddAlertResult {
  const existing = getAlerts().find((a) => sameWatch(a, alert));
  if (existing) return { status: 'duplicate', alert: existing };
  const entry: PriceAlert = { ...alert, id: uid(), createdAt: now() };
  return writeJSON(KEYS.alerts, [entry, ...getAlerts()].slice(0, 50))
    ? { status: 'added', alert: entry }
    : { status: 'failed' };
}

export const removeAlert = (id: string) => writeJSON(KEYS.alerts, getAlerts().filter((a) => a.id !== id));

export const restoreAlert = (alert: PriceAlert) =>
  writeJSON(KEYS.alerts, [alert, ...getAlerts().filter((a) => a.id !== alert.id)].slice(0, 50));

export function updateAlert(id: string, patch: Partial<PriceAlert>): void {
  writeJSON(KEYS.alerts, getAlerts().map((a) => (a.id === id ? { ...a, ...patch } : a)));
}

/** An alert whose departure date has passed can never be booked, so it is not checked. */
export const isExpired = (alert: PriceAlert) => alert.departureDate < todayISO();

export type CheckResult =
  | { status: 'checked'; alert: PriceAlert }
  /** The prediction model is not connected, so there is nothing to compare against. */
  | { status: 'unavailable'; alert: PriceAlert }
  | { status: 'failed'; alert: PriceAlert };

/**
 * Compares one alert against the model's predicted fare. This is a manual check: there is
 * no background job and no notification, and the copy around it must not promise one.
 */
export async function checkAlert(alert: PriceAlert): Promise<CheckResult> {
  try {
    const params = new URLSearchParams({
      from: alert.origin,
      to: alert.destination,
      departureDate: alert.departureDate,
      travelClass: alert.travelClass,
    });
    const res = await fetch(`/api/ml/predictions?${params}`);
    const data: unknown = await res.json().catch(() => null);
    if (res.status === 503) return { status: 'unavailable', alert };
    const price = isRecord(data) && isFiniteNumber(data.predictedPrice) ? data.predictedPrice : undefined;
    if (!res.ok || price === undefined) return { status: 'failed', alert };

    const patch: Partial<PriceAlert> = { lastChecked: now(), lastPrice: price, triggered: price <= alert.targetPrice };
    updateAlert(alert.id, patch);
    return { status: 'checked', alert: { ...alert, ...patch } };
  } catch {
    return { status: 'failed', alert };
  }
}

// ---- Reading everything in a component -------------------------------------

export interface SavedData {
  trips: SavedTrip[];
  searches: RecentSearch[];
  alerts: PriceAlert[];
}

const rawSnapshot = () => {
  try {
    return [KEYS.trips, KEYS.searches, KEYS.alerts].map((k) => window.localStorage.getItem(k) ?? '').join('\u0000');
  } catch {
    return '';
  }
};

/**
 * Saved trips, searches and alerts, kept current as they change in this tab or another.
 * Returns null during server rendering and hydration, when storage cannot be read, so the
 * page can show a skeleton instead of a flash of the empty state. The lists are parsed
 * once per change of the stored text, so an unchanged store returns the same objects.
 */
export function useSavedData(): SavedData | null {
  const raw = useSyncExternalStore(subscribeToStorage, rawSnapshot, () => null);
  return useMemo(() => (raw === null ? null : { trips: getTrips(), searches: getRecentSearches(), alerts: getAlerts() }), [raw]);
}
