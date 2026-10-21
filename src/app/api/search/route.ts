import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { canonicalCity } from '@/lib/cities';
import { addDays, daysBetween, isISODate, todayISO } from '@/lib/dates';
import { enhanceSearchResults, historicalRange, type FlightHistoryInsight } from '@/lib/ml-service';
import {
  ServiceNotConfiguredError,
  UnsupportedCityError,
  searchFlights,
  searchHotels,
  type FlightOffer,
  type HotelOffer,
} from '@/lib/serpapi-service';

export const dynamic = 'force-dynamic';

const isoDate = z.string().refine(isISODate, 'Use a yyyy-mm-dd date');

const schema = z
  .object({
    from: z.string().trim().min(1),
    to: z.string().trim().min(1),
    departureDate: isoDate,
    returnDate: isoDate.optional(),
    adults: z.number().int().min(1).max(9),
    children: z.number().int().min(0).max(9).default(0),
    infants: z.number().int().min(0).max(9).default(0),
    travelClass: z.enum(['economy', 'premium', 'business', 'first']).default('economy'),
  })
  .refine((v) => canonicalCity(v.from).toLowerCase() !== canonicalCity(v.to).toLowerCase(), {
    message: 'Choose two different cities.',
    path: ['to'],
  })
  .refine((v) => v.departureDate >= todayISO(), { message: 'The departure date is in the past.', path: ['departureDate'] })
  .refine((v) => !v.returnDate || v.returnDate >= v.departureDate, {
    message: 'The return date is before the departure date.',
    path: ['returnDate'],
  });

/**
 * Where each part of the result came from. The page shows "not connected" for a missing
 * API key instead of anything resembling results, which is what it used to do with
 * random prices, made-up hotels and train numbers from other routes.
 */
type Status = 'ok' | 'not_connected' | 'unsupported_city' | 'error';

interface Section<T> {
  status: Status;
  items: T[];
  message?: string;
}

export type SearchFlight = FlightOffer & { historyInsight?: FlightHistoryInsight };

export interface SearchResponse {
  success: true;
  flights: Section<SearchFlight> & { bookingUrl: string | null };
  hotels: Section<HotelOffer> & { nights: number };
  history: ReturnType<typeof historicalRange>;
  searchedAt: string;
}

function failure(error: unknown): { status: Status; message: string } {
  if (error instanceof ServiceNotConfiguredError) return { status: 'not_connected', message: 'Live fares aren’t connected yet.' };
  if (error instanceof UnsupportedCityError) return { status: 'unsupported_city', message: `We can’t search flights for ${error.city} yet.` };
  return { status: 'error', message: 'The live fare service didn’t respond. Try again in a moment.' };
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid search', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const p = parsed.data;
  const nights = p.returnDate ? Math.max(1, daysBetween(p.departureDate, p.returnDate)) : 2;
  const checkOut = p.returnDate && p.returnDate > p.departureDate ? p.returnDate : addDays(p.departureDate, nights);

  const [flightsResult, hotelsResult] = await Promise.allSettled([
    searchFlights({
      origin: p.from,
      destination: p.to,
      departureDate: p.departureDate,
      returnDate: p.returnDate,
      adults: p.adults,
      children: p.children,
      travelClass: p.travelClass,
    }),
    searchHotels({ destination: p.to, checkInDate: p.departureDate, checkOutDate: checkOut, adults: p.adults, children: p.children }),
  ]);

  const flights: SearchResponse['flights'] =
    flightsResult.status === 'fulfilled'
      ? {
          status: 'ok',
          items: enhanceSearchResults(flightsResult.value.flights, (f) => f.price, p.from, p.to, p.departureDate, p.travelClass),
          bookingUrl: flightsResult.value.bookingUrl,
        }
      : { ...failure(flightsResult.reason), items: [], bookingUrl: null };

  const hotels: SearchResponse['hotels'] =
    hotelsResult.status === 'fulfilled'
      ? { status: 'ok', items: hotelsResult.value.slice(0, 6), nights }
      : { ...failure(hotelsResult.reason), items: [], nights };

  const body: SearchResponse = {
    success: true,
    flights,
    hotels,
    history: historicalRange(p.from, p.to, { departureDate: p.departureDate, travelClass: p.travelClass }),
    searchedAt: new Date().toISOString(),
  };
  return NextResponse.json(body);
}
