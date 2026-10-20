/**
 * localStorage access for data the browser keeps for the user.
 *
 * Everything read back is untrusted: it may come from an older version of the app, a
 * hand edit, another tab mid-write, or a truncated quota failure. Reads therefore never
 * throw and never return a value that fails validation, so a bad entry costs the user
 * that entry rather than locking them out of the page that renders it.
 */

export type Guard<T> = (value: unknown) => value is T

const hasWindow = () => typeof window !== 'undefined'

/** Event other components listen for to re-read storage after a write in this tab. */
export const STORAGE_EVENT = 'tt-storage'

/** The parsed JSON at `key`, or undefined if missing, unreadable or not valid JSON. */
export function readJSON(key: string): unknown {
  if (!hasWindow()) return undefined
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? undefined : JSON.parse(raw)
  } catch {
    return undefined
  }
}

/**
 * The list at `key`, keeping only items that pass `guard`. A non-array value reads as
 * an empty list, and one malformed item is dropped instead of discarding the rest.
 */
export function readList<T>(key: string, guard: Guard<T>): T[] {
  const value = readJSON(key)
  return Array.isArray(value) ? value.filter(guard) : []
}

/**
 * Writes `value` as JSON. Returns false when the browser refuses (quota full, storage
 * disabled, private mode), so callers can tell the user instead of claiming success.
 */
export function writeJSON(key: string, value: unknown): boolean {
  if (!hasWindow()) return false
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    return false
  }
  window.dispatchEvent(new Event(STORAGE_EVENT))
  return true
}

export function removeKey(key: string): void {
  if (!hasWindow()) return
  try {
    window.localStorage.removeItem(key)
    window.dispatchEvent(new Event(STORAGE_EVENT))
  } catch {
    /* storage disabled: nothing to remove */
  }
}

/**
 * Calls `onChange` when storage changes in this tab or in another one. The browser's own
 * `storage` event only fires in *other* tabs, so both are needed.
 */
export function subscribeToStorage(onChange: () => void): () => void {
  if (!hasWindow()) return () => {}
  window.addEventListener(STORAGE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(STORAGE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

// ---- Small guards shared by the validators ----------------------------------
export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
export const isString = (v: unknown): v is string => typeof v === 'string'
export const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
export const isOptional = <T,>(guard: (v: unknown) => v is T) => (v: unknown): v is T | undefined => v === undefined || guard(v)
