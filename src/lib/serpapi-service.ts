import { getJson } from 'serpapi';

/**
 * Live flight and hotel results from Google Flights and Google Hotels through SerpAPI.
 *
 * Times are kept exactly as SerpAPI gives them: the airport's local wall-clock time,
 * "2026-10-25 06:05". They used to be turned into Date objects on the server, which runs
 * in UTC, so every Indian departure was shown 5 hours 30 minutes late.
 */

export interface FlightOffer {
  id: string;
  airline: string;
  flightNumber: string;
  /** yyyy-mm-dd and HH:mm, local to the departure airport. */
  departDate: string;
  departTime: string;
  /** yyyy-mm-dd and HH:mm, local to the arrival airport. */
  arriveDate: string;
  arriveTime: string;
  durationMinutes: number;
  stops: number;
  /** Whole rupees for all passengers, as Google Flights quotes it. */
  price: number;
}

export interface FlightSearchResult {
  flights: FlightOffer[];
  /** The same search on Google Flights, where the fares can be booked. */
  bookingUrl: string | null;
}

export interface HotelOffer {
  id: string;
  name: string;
  link: string | null;
  area: string | null;
  /** Lowest nightly rate in rupees, or null when SerpAPI gives none. */
  ratePerNight: number | null;
  totalRate: number | null;
  /** Guest rating out of 5 and its review count, only when SerpAPI reports them. */
  rating: number | null;
  reviews: number | null;
  hotelClass: number | null;
  image: string | null;
  amenities: string[];
}

export class ServiceNotConfiguredError extends Error {
  constructor() {
    super('SERPAPI_KEY is not set');
    this.name = 'ServiceNotConfiguredError';
  }
}

export class UnsupportedCityError extends Error {
  constructor(public city: string) {
    super(`No airport code known for ${city}`);
    this.name = 'UnsupportedCityError';
  }
}

/** Read per call: on Workers the environment is filled in per request, not at import. */
const apiKey = () => process.env.SERPAPI_KEY?.trim() || null;
export const isSerpConfigured = () => apiKey() !== null;

const TIMEOUT_MS = 15_000;

/**
 * getJson's callback form never runs when SerpAPI answers with an HTTP error (a bad key,
 * an exhausted quota), so a promise wrapped around it never settled and the search page
 * spun forever. The promise form rejects instead; this also caps how long we wait.
 */
async function query(params: Record<string, unknown>): Promise<Record<string, any>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('SerpAPI did not answer in time')), TIMEOUT_MS);
  });
  try {
    const json = (await Promise.race([getJson(params as any), timeout])) as Record<string, any>;
    if (json?.error) throw new Error(`SerpAPI: ${json.error}`);
    return json;
  } finally {
    clearTimeout(timer);
  }
}

const AIRPORTS: Record<string, string> = {
  mumbai: 'BOM', bombay: 'BOM',
  delhi: 'DEL', 'new delhi': 'DEL',
  bangalore: 'BLR', bengaluru: 'BLR',
  chennai: 'MAA', madras: 'MAA',
  kolkata: 'CCU', calcutta: 'CCU',
  hyderabad: 'HYD',
  pune: 'PNQ', goa: 'GOI',
  cochin: 'COK', kochi: 'COK',
  trivandrum: 'TRV', thiruvananthapuram: 'TRV',
  ahmedabad: 'AMD', jaipur: 'JAI', lucknow: 'LKO', bhubaneswar: 'BBI', indore: 'IDR',
  coimbatore: 'CJB', mangalore: 'IXE', mangaluru: 'IXE', nagpur: 'NAG', surat: 'STV',
  vijayawada: 'VGA', tirupati: 'TIR', madurai: 'IXM', varanasi: 'VNS', amritsar: 'ATQ',
  srinagar: 'SXR', chandigarh: 'IXC', guwahati: 'GAU', patna: 'PAT', bagdogra: 'IXB',
  udaipur: 'UDR', leh: 'IXL', 'port blair': 'IXZ', dehradun: 'DED', visakhapatnam: 'VTZ',
  dubai: 'DXB', singapore: 'SIN', bangkok: 'BKK', london: 'LHR', 'kuala lumpur': 'KUL',
};

/** The IATA code for a city, or for a code passed in directly. Throws for unknown places. */
export function airportCode(cityOrCode: string): string {
  const key = cityOrCode.toLowerCase().trim();
  if (AIRPORTS[key]) return AIRPORTS[key];
  if (/^[a-z]{3}$/i.test(key)) return key.toUpperCase();
  throw new UnsupportedCityError(cityOrCode);
}

const CLASS_CODE: Record<string, number> = { economy: 1, premium: 2, business: 3, first: 4 };

const split = (stamp: unknown): [string, string] => {
  const m = typeof stamp === 'string' ? /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}:\d{2})/.exec(stamp) : null;
  return m ? [m[1], m[2].padStart(5, '0')] : ['', ''];
};

function toOffer(f: any): FlightOffer | null {
  const legs: any[] = Array.isArray(f?.flights) ? f.flights : [];
  const price = Number(f?.price);
  if (legs.length === 0 || !Number.isFinite(price) || price <= 0) return null;
  const first = legs[0];
  const last = legs[legs.length - 1];
  const [departDate, departTime] = split(first.departure_airport?.time);
  const [arriveDate, arriveTime] = split(last.arrival_airport?.time);
  if (!departTime || !arriveTime) return null;
  return {
    id: String(f.booking_token ?? `${first.flight_number}-${departDate}-${departTime}`),
    airline: first.airline || 'Unknown airline',
    flightNumber: first.flight_number || '',
    departDate,
    departTime,
    arriveDate,
    arriveTime,
    durationMinutes: Number(f.total_duration) || legs.reduce((s, l) => s + (Number(l.duration) || 0), 0),
    stops: Math.max(0, legs.length - 1),
    price: Math.round(price),
  };
}

export async function searchFlights(params: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  travelClass?: string;
}): Promise<FlightSearchResult> {
  const key = apiKey();
  if (!key) throw new ServiceNotConfiguredError();
  const json = await query({
    engine: 'google_flights',
    departure_id: airportCode(params.origin),
    arrival_id: airportCode(params.destination),
    outbound_date: params.departureDate,
    ...(params.returnDate ? { return_date: params.returnDate, type: 1 } : { type: 2 }),
    adults: params.adults,
    children: params.children ?? 0,
    travel_class: CLASS_CODE[params.travelClass ?? 'economy'] ?? 1,
    currency: 'INR',
    hl: 'en',
    gl: 'in',
    api_key: key,
  });
  const raw = [...(json.best_flights ?? []), ...(json.other_flights ?? [])];
  return {
    flights: raw.map(toOffer).filter((f): f is FlightOffer => f !== null),
    bookingUrl: typeof json.search_metadata?.google_flights_url === 'string' ? json.search_metadata.google_flights_url : null,
  };
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);

export async function searchHotels(params: {
  destination: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children?: number;
}): Promise<HotelOffer[]> {
  const key = apiKey();
  if (!key) throw new ServiceNotConfiguredError();
  const json = await query({
    engine: 'google_hotels',
    q: `hotels in ${params.destination}`,
    check_in_date: params.checkInDate,
    check_out_date: params.checkOutDate,
    adults: params.adults,
    children: params.children ?? 0,
    currency: 'INR',
    hl: 'en',
    gl: 'in',
    api_key: key,
  });
  const props: any[] = Array.isArray(json.properties) ? json.properties : [];
  return props.map((h, i) => ({
    id: String(h.property_token ?? `hotel-${i}`),
    name: h.name || 'Unnamed property',
    link: typeof h.link === 'string' ? h.link : null,
    area: h.nearby_places?.[0]?.name ?? null,
    ratePerNight: num(h.rate_per_night?.extracted_lowest),
    totalRate: num(h.total_rate?.extracted_lowest),
    rating: num(h.overall_rating),
    reviews: num(h.reviews),
    hotelClass: num(h.extracted_hotel_class),
    image: h.images?.[0]?.thumbnail ?? null,
    amenities: Array.isArray(h.amenities) ? h.amenities.slice(0, 6) : [],
  }));
}
