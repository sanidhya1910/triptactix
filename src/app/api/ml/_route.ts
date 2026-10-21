import { NextRequest, NextResponse } from 'next/server';
import { canonicalCity } from '@/lib/cities';

/**
 * Shared handling for the route-level statistics endpoints. Each answers from the
 * precomputed history, so the only failure modes are bad input (400) and a route the
 * history does not cover (404 with code "no_history"), which the UI reports as such.
 */
export function routeQuery<T>(request: NextRequest, compute: (from: string, to: string) => T | null) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from')?.trim();
  const to = searchParams.get('to')?.trim();
  if (!from || !to) {
    return NextResponse.json({ error: 'Missing required parameters: from, to', code: 'bad_request' }, { status: 400 });
  }
  if (canonicalCity(from).toLowerCase() === canonicalCity(to).toLowerCase()) {
    return NextResponse.json({ error: 'Choose two different cities.', code: 'same_city' }, { status: 400 });
  }
  const result = compute(from, to);
  if (!result) {
    return NextResponse.json(
      { error: `No fare history for ${canonicalCity(from)} to ${canonicalCity(to)}.`, code: 'no_history' },
      { status: 404 },
    );
  }
  return NextResponse.json({ ...result, source: 'historical' });
}
