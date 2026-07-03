import fs from 'fs';
import path from 'path';
import { canonicalCity } from '@/lib/cities';

/**
 * Loads real published flight schedules from data/Air-Clean.csv.
 *
 * This dataset has NO prices, so it is not used for price prediction. It does
 * have real airlines, flight numbers, departure/arrival times and the days of
 * week each flight operates -- which we use to make non-live (fallback) results
 * look like genuine flights instead of randomly generated ones.
 */
export interface ScheduleEntry {
  airline: string;
  airlineCode: string;
  flightNumber: string;   // e.g. "6E 572"
  origin: string;
  destination: string;
  depTime: string;        // "HH:MM"
  arrTime: string;        // "HH:MM"
  daysOfWeek: number[];   // JS getDay() values, 0 = Sunday
}

const AIRLINE_CODES: Record<string, string> = {
  'IndiGo': '6E', 'SpiceJet': 'SG', 'Air India': 'AI', 'Air India Express': 'IX',
  'Vistara': 'UK', 'GoAir': 'G8', 'Go First': 'G8', 'Akasa Air': 'QP',
  'AirAsia': 'I5', 'AirAsia India': 'I5', 'Alliance Air (India)': '9I',
  'Alliance Air': '9I', 'Star Air': 'S5', 'TruJet': '2T', 'Jet Airways': '9W',
  'JetLite': 'S2', 'FlyBig': 'S9', 'IndiaOne Air': 'I7',
};

const DAY_INDEX: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

// City alias handling lives in one place (src/lib/cities.ts).
const normalizeCity = canonicalCity;

/** Minimal quote-aware CSV line splitter (daysOfWeek can contain commas). */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      out.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

class ScheduleService {
  private byRoute = new Map<string, ScheduleEntry[]>();
  private loaded = false;

  private routeKey(from: string, to: string): string {
    return `${normalizeCity(from)}->${normalizeCity(to)}`;
  }

  private load() {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const csvPath = path.join(process.cwd(), 'data', 'Air-Clean.csv');
      if (!fs.existsSync(csvPath)) return;

      const lines = fs.readFileSync(csvPath, 'utf-8').split('\n');
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const v = parseCsvLine(line);
        if (v.length < 7) continue;

        const airline = (v[0] || '').trim();
        const flightNum = (v[1] || '').trim();
        const origin = normalizeCity(v[2] || '');
        const destination = normalizeCity(v[3] || '');
        const depTime = (v[5] || '').trim();
        const arrTime = (v[6] || '').trim();
        if (!airline || !origin || !destination || !/^\d{1,2}:\d{2}$/.test(depTime)) continue;

        const days = (v[4] || '')
          .split(',')
          .map((d) => DAY_INDEX[d.trim().toLowerCase()])
          .filter((d): d is number => d !== undefined);

        const code = AIRLINE_CODES[airline] || airline.slice(0, 2).toUpperCase();
        const entry: ScheduleEntry = {
          airline,
          airlineCode: code,
          flightNumber: `${code} ${flightNum}`,
          origin,
          destination,
          depTime,
          arrTime,
          daysOfWeek: days.length ? days : [0, 1, 2, 3, 4, 5, 6],
        };

        const key = this.routeKey(origin, destination);
        const arr = this.byRoute.get(key);
        if (arr) arr.push(entry);
        else this.byRoute.set(key, [entry]);
      }
      console.log(`Loaded schedules for ${this.byRoute.size} routes from Air-Clean.csv`);
    } catch (error) {
      console.error('Error loading schedule data:', error);
    }
  }

  /**
   * Real schedules for a route, optionally only flights that operate on the
   * given date's weekday. De-duplicated by flight number.
   */
  getSchedules(from: string, to: string, onDate?: Date): ScheduleEntry[] {
    this.load();
    const entries = this.byRoute.get(this.routeKey(from, to)) || [];
    const weekday = onDate?.getDay();

    const seen = new Set<string>();
    const result: ScheduleEntry[] = [];
    for (const e of entries) {
      if (weekday !== undefined && !e.daysOfWeek.includes(weekday)) continue;
      if (seen.has(e.flightNumber)) continue;
      seen.add(e.flightNumber);
      result.push(e);
    }
    // Sort by departure time for a natural ordering.
    return result.sort((a, b) => a.depTime.localeCompare(b.depTime));
  }

  hasRoute(from: string, to: string): boolean {
    this.load();
    return (this.byRoute.get(this.routeKey(from, to))?.length ?? 0) > 0;
  }
}

export const scheduleService = new ScheduleService();
