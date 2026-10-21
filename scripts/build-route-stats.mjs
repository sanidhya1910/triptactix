#!/usr/bin/env node
/**
 * Aggregates data/Indian Airlines.csv into src/lib/ml/route-stats.json.
 *
 * The CSV is 24 MB and is read with fs, which Cloudflare Workers do not have, so the
 * Fare data pages and APIs could never load it in production. Every figure they show is
 * an average, a minimum, a maximum or a count, so this stores sums, counts, mins and
 * maxes per route and class. Every number can still be computed exactly at request time,
 * and the result is a few kilobytes that bundle with the Worker.
 *
 * Run after the CSV changes:  node scripts/build-route-stats.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** Booking-window buckets, by days between booking and departure. */
export const WINDOWS = [
  ['0-7 days', 7],
  ['8-21 days', 21],
  ['22-45 days', 45],
  ['46-60 days', 60],
  ['60+ days', Infinity],
]

const windowOf = (daysLeft) => WINDOWS.find(([, max]) => daysLeft <= max)[0]

const cell = () => ({ count: 0, sum: 0, min: Infinity, max: -Infinity })
const add = (c, price) => {
  c.count += 1
  c.sum += price
  if (price < c.min) c.min = price
  if (price > c.max) c.max = price
}

/**
 * Header: ,airline,flight,source_city,departure_time,stops,arrival_time,destination_city,
 * class,duration,days_left,price. Rows that do not parse are counted and skipped.
 */
export function aggregate(csv) {
  const lines = csv.split(/\r?\n/)
  const routes = {}
  const airlines = {}
  let rows = 0
  let skipped = 0

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const v = line.split(',')
    const price = Number(v[11])
    const daysLeft = Number(v[10])
    const duration = Number(v[9])
    const [airline, from, slot, to, cls] = [v[1], v[3], v[4], v[7], v[8]]
    if (v.length < 12 || !airline || !from || !to || !cls || !Number.isFinite(price) || price <= 0 || !Number.isFinite(daysLeft)) {
      skipped++
      continue
    }
    rows++
    airlines[airline] = (airlines[airline] ?? 0) + 1

    const key = `${from}|${to}|${cls.toLowerCase()}`
    const r = (routes[key] ??= {
      from,
      to,
      class: cls.toLowerCase(),
      all: cell(),
      durationSum: 0,
      durationCount: 0,
      byAirline: {},
      bySlot: {},
      byWindow: {},
      byDecade: {},
    })
    add(r.all, price)
    if (Number.isFinite(duration) && duration > 0) {
      r.durationSum += duration * 60
      r.durationCount += 1
    }
    add((r.byAirline[airline] ??= cell()), price)
    add((r.bySlot[slot] ??= cell()), price)
    add((r.byWindow[windowOf(daysLeft)] ??= cell()), price)
    // Ten-day buckets for the price-history curve: 0 = 0-9 days left, 10 = 10-19, ...
    add((r.byDecade[Math.floor(daysLeft / 10) * 10] ??= cell()), price)
  }

  return { rows, skipped, airlines, routes: Object.values(routes) }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const src = new URL('../data/Indian Airlines.csv', import.meta.url)
  const out = new URL('../src/lib/ml/route-stats.json', import.meta.url)
  const stats = aggregate(readFileSync(src, 'utf8'))
  const json = JSON.stringify({ source: 'data/Indian Airlines.csv', ...stats })
  mkdirSync(new URL('.', out), { recursive: true })
  writeFileSync(out, json + '\n')
  console.log(`${stats.rows} rows (${stats.skipped} skipped), ${stats.routes.length} route-class pairs, ${(json.length / 1024).toFixed(1)} KB`)
}
