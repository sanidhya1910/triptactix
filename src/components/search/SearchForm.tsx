'use client';

import { useState } from 'react';
import { Minus, Plus } from '@phosphor-icons/react/ssr';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import CityAutocomplete from '@/components/ui/CityAutocomplete';
import { DateRangePicker, DatePicker } from '@/components/ui/date-picker';
import { City, canonicalCity, searchCities } from '@/lib/cities';
import { parseISODate, toISODate, todayISO } from '@/lib/dates';
import { cn } from '@/lib/utils';

/** A search as the API takes it: city names and yyyy-mm-dd dates, never Date objects. */
export interface SearchQuery {
  from: string;
  to: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  travelClass: 'economy' | 'premium' | 'business' | 'first';
}

interface SearchFormProps {
  onSearch: (query: SearchQuery) => void;
  loading?: boolean;
  /** Prefills the form, e.g. from a recent search or a link. */
  initial?: Partial<SearchQuery>;
}

type FieldErrors = Partial<Record<'origin' | 'destination' | 'departure' | 'return', string>>;

const PASSENGERS = [
  { key: 'adults', label: 'Adults', hint: '12 and over', min: 1 },
  { key: 'children', label: 'Children', hint: '2 to 11', min: 0 },
  { key: 'infants', label: 'Infants', hint: 'Under 2', min: 0 },
] as const;

/** A City for a name from a URL or saved search, when the list knows it. */
const findCity = (name?: string): City | null => {
  if (!name) return null;
  const want = canonicalCity(name).toLowerCase();
  return searchCities(name, 20).find((c) => canonicalCity(c.name).toLowerCase() === want) ?? null;
};

export default function SearchForm({ onSearch, loading = false, initial }: SearchFormProps) {
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>(initial?.returnDate ? 'round-trip' : 'one-way');
  // The city picked from the list, and separately the text in the box. Driving the box
  // from the picked city alone cleared it on the first keystroke of an edit, because
  // typing un-picks the city.
  const [originCity, setOriginCity] = useState<City | null>(() => findCity(initial?.from));
  const [originText, setOriginText] = useState(() => originCity?.name ?? initial?.from ?? '');
  const [destinationCity, setDestinationCity] = useState<City | null>(() => findCity(initial?.to));
  const [destinationText, setDestinationText] = useState(() => destinationCity?.name ?? initial?.to ?? '');
  const [departureDate, setDepartureDate] = useState<Date | undefined>(() => {
    const d = initial?.departureDate ? parseISODate(initial.departureDate) : null;
    return d && initial!.departureDate! >= todayISO() ? d : undefined;
  });
  const [returnDate, setReturnDate] = useState<Date | undefined>(() =>
    initial?.returnDate ? (parseISODate(initial.returnDate) ?? undefined) : undefined,
  );
  const [passengers, setPassengers] = useState({
    adults: initial?.adults ?? 1,
    children: initial?.children ?? 0,
    infants: initial?.infants ?? 0,
  });
  const [travelClass, setTravelClass] = useState<SearchQuery['travelClass']>(initial?.travelClass ?? 'economy');
  const [errors, setErrors] = useState<FieldErrors>({});

  const clear = (k: keyof FieldErrors) => setErrors((e) => ({ ...e, [k]: undefined }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: FieldErrors = {};
    if (!originCity) next.origin = 'Pick a departure city from the list.';
    if (!destinationCity) next.destination = 'Pick a destination city from the list.';
    if (originCity && destinationCity && canonicalCity(originCity.name) === canonicalCity(destinationCity.name)) {
      next.destination = 'Departure and destination cannot be the same city.';
    }
    const dep = departureDate ? toISODate(departureDate) : '';
    const ret = returnDate ? toISODate(returnDate) : '';
    if (!dep) next.departure = 'Choose a departure date.';
    else if (dep < todayISO()) next.departure = 'That date has passed. Choose today or later.';
    if (tripType === 'round-trip') {
      if (!ret) next.return = 'Choose a return date.';
      else if (dep && ret < dep) next.return = 'The return date is before the departure date.';
    }

    setErrors(next);
    const firstError = (['origin', 'destination', 'departure', 'return'] as const).find((k) => next[k]);
    if (firstError) {
      // Take the user to the first problem rather than leaving them to find it.
      const target = {
        origin: 'origin-city',
        destination: 'destination-city',
        departure: tripType === 'round-trip' ? undefined : 'departure-date',
        return: undefined,
      }[firstError];
      if (target) document.getElementById(target)?.focus();
      return;
    }

    onSearch({
      from: originCity!.name,
      to: destinationCity!.name,
      departureDate: dep,
      returnDate: tripType === 'round-trip' ? ret : undefined,
      ...passengers,
      travelClass,
    });
  };

  const step = (key: (typeof PASSENGERS)[number]['key'], delta: number, min: number) =>
    setPassengers((p) => {
      const value = Math.min(9, Math.max(min, p[key] + delta));
      const next = { ...p, [key]: value };
      // Each infant travels on an adult's lap, so there cannot be more infants than adults.
      if (next.infants > next.adults) next.infants = next.adults;
      return next;
    });

  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="border-b border-line p-6">
        <div role="radiogroup" aria-label="Trip type" className="inline-flex rounded-lg border border-line bg-surface-sunken p-1">
          {(['one-way', 'round-trip'] as const).map((type) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={tripType === type}
              onClick={() => {
                setTripType(type);
                if (type === 'one-way') {
                  setReturnDate(undefined);
                  clear('return');
                }
              }}
              className={cn(
                'rounded-md px-4 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                tripType === type ? 'bg-surface font-medium text-ink shadow-xs' : 'text-ink-secondary hover:text-ink',
              )}
            >
              {type === 'one-way' ? 'One way' : 'Round trip'}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={submit} noValidate className="space-y-6 p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="From" htmlFor="origin-city" error={errors.origin}>
            <CityAutocomplete
              id="origin-city"
              value={originText}
              onChange={(city, text) => {
                setOriginCity(city);
                setOriginText(text);
                clear('origin');
              }}
              placeholder="Delhi"
              invalid={Boolean(errors.origin)}
            />
          </Field>
          <Field label="To" htmlFor="destination-city" error={errors.destination}>
            <CityAutocomplete
              id="destination-city"
              value={destinationText}
              onChange={(city, text) => {
                setDestinationCity(city);
                setDestinationText(text);
                clear('destination');
              }}
              placeholder="Goa"
              invalid={Boolean(errors.destination)}
            />
          </Field>
        </div>

        {tripType === 'round-trip' ? (
          <DateRangePicker
            startDate={departureDate}
            endDate={returnDate}
            onStartDateChange={(d) => {
              setDepartureDate(d);
              clear('departure');
            }}
            onEndDateChange={(d) => {
              setReturnDate(d);
              clear('return');
            }}
            startError={errors.departure}
            endError={errors.return}
          />
        ) : (
          <Field label="Departure date" htmlFor="departure-date" error={errors.departure}>
            <DatePicker
              id="departure-date"
              date={departureDate}
              onDateChange={(d) => {
                setDepartureDate(d);
                clear('departure');
              }}
              placeholder="Select a date"
              invalid={Boolean(errors.departure)}
            />
          </Field>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <fieldset>
            <legend className="text-sm font-medium text-ink">Passengers</legend>
            <div className="mt-3 divide-y divide-line rounded-md border border-line">
              {PASSENGERS.map((row) => (
                <div key={row.key} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-ink-secondary">
                    {row.label} <span className="text-xs text-ink-tertiary">{row.hint}</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`One fewer ${row.label.toLowerCase().replace(/s$/, '')}`}
                      disabled={passengers[row.key] <= row.min}
                      onClick={() => step(row.key, -1, row.min)}
                    >
                      <Minus className="h-3.5 w-3.5" weight="bold" />
                    </Button>
                    <output aria-label={`${row.label}`} className="w-7 text-center font-mono text-sm text-ink">
                      {passengers[row.key]}
                    </output>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`One more ${row.label.toLowerCase().replace(/s$/, '')}`}
                      disabled={passengers[row.key] >= 9 || (row.key === 'infants' && passengers.infants >= passengers.adults)}
                      onClick={() => step(row.key, 1, row.min)}
                    >
                      <Plus className="h-3.5 w-3.5" weight="bold" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          <Field label="Cabin class" htmlFor="travel-class">
            <select
              id="travel-class"
              value={travelClass}
              onChange={(e) => setTravelClass(e.target.value as SearchQuery['travelClass'])}
              className="h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink transition-colors hover:border-ink/25 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
            >
              <option value="economy">Economy</option>
              <option value="premium">Premium economy</option>
              <option value="business">Business</option>
              <option value="first">First</option>
            </select>
          </Field>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? 'Searching' : 'Search flights'}
        </Button>
      </form>
    </div>
  );
}
