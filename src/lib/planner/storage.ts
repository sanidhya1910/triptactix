import type { Trip } from './types'

/**
 * Persistence boundary. Swap these two functions for API calls to move to a backend.
 */
export interface Persisted {
  trip: Trip
  dark: boolean
}

const KEY = 'triptactix-planner-v1'

export function loadState(): Persisted | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Persisted) : null
  } catch {
    return null
  }
}

export function saveState(state: Persisted): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage full or blocked: ignore */
  }
}
