'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Minus, Plus, TrendUp } from '@phosphor-icons/react/ssr';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Field } from '@/components/ui/field';
import { SearchParams } from '@/types/travel';
import CityAutocomplete from '@/components/ui/CityAutocomplete';
import { DateRangePicker, DatePicker } from '@/components/ui/date-picker';
import { City } from '@/lib/cities';
import { cn } from '@/lib/utils';

interface SearchFormProps {
  onSearch: (params: SearchParams, useMLPredictions: boolean) => void;
  loading?: boolean;
}

interface SearchFormData {
  departureDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  travelClass: 'economy' | 'premium' | 'business' | 'first';
}

type FieldErrors = Partial<Record<'origin' | 'destination' | 'departure' | 'return', string>>;

const passengerRows = [
  { key: 'adults', label: 'Adults', min: 1 },
  { key: 'children', label: 'Children', min: 0 },
  { key: 'infants', label: 'Infants', min: 0 },
] as const;

export default function SearchForm({ onSearch, loading = false }: SearchFormProps) {
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('one-way');
  const [originCity, setOriginCity] = useState<City | null>(null);
  const [destinationCity, setDestinationCity] = useState<City | null>(null);
  const [useMLPredictions, setUseMLPredictions] = useState(false);
  const [departureDate, setDepartureDate] = useState<Date | undefined>(undefined);
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  // Cities and dates live outside react-hook-form, so their errors are tracked here
  // and rendered inline. Previously all three cases went to window.alert().
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const { handleSubmit, register, watch, setValue } = useForm<SearchFormData>({
    defaultValues: { adults: 1, children: 0, infants: 0, travelClass: 'economy' },
  });

  const onSubmit = (data: SearchFormData) => {
    const next: FieldErrors = {};
    if (!originCity) next.origin = 'Pick a departure city from the list.';
    if (!destinationCity) next.destination = 'Pick a destination city from the list.';
    if (originCity && destinationCity && originCity.code === destinationCity.code) {
      next.destination = 'Departure and destination cannot be the same city.';
    }
    if (!departureDate) next.departure = 'Choose a departure date.';
    if (tripType === 'round-trip' && !returnDate) next.return = 'Choose a return date.';

    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;

    onSearch(
      {
        origin: {
          id: '1',
          name: originCity!.name,
          code: originCity!.code,
          city: originCity!.name,
          country: originCity!.country,
          type: 'airport',
        },
        destination: {
          id: '2',
          name: destinationCity!.name,
          code: destinationCity!.code,
          city: destinationCity!.name,
          country: destinationCity!.country,
          type: 'airport',
        },
        departureDate: departureDate!,
        returnDate,
        passengers: { adults: data.adults, children: data.children, infants: data.infants },
        travelClass: data.travelClass,
      },
      useMLPredictions
    );
  };

  const step = (key: (typeof passengerRows)[number]['key'], delta: number, min: number) =>
    setValue(key, Math.min(9, Math.max(min, watch(key) + delta)));

  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-6">
        {/* Segmented control, not two competing filled buttons. */}
        <div
          role="radiogroup"
          aria-label="Trip type"
          className="inline-flex rounded-lg border border-line bg-surface-sunken p-1"
        >
          {(['one-way', 'round-trip'] as const).map((type) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={tripType === type}
              onClick={() => setTripType(type)}
              className={cn(
                'rounded-md px-4 py-1.5 text-sm transition-colors',
                tripType === type
                  ? 'bg-surface font-medium text-ink shadow-xs'
                  : 'text-ink-secondary hover:text-ink'
              )}
            >
              {type === 'one-way' ? 'One way' : 'Round trip'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Switch id="ml-toggle" checked={useMLPredictions} onCheckedChange={setUseMLPredictions} />
          <Label htmlFor="ml-toggle" className="flex cursor-pointer items-center gap-2">
            <TrendUp className="h-4 w-4 text-ink-tertiary" weight="bold" />
            Fare predictions
          </Label>
        </div>
      </div>

      {useMLPredictions && (
        <p className="border-b border-line bg-info px-6 py-3 text-sm text-info-fg">
          Predictions cover flights between Delhi, Mumbai, Bengaluru, Chennai, Hyderabad and
          Kolkata. Other routes still return live fares, without a forecast.
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="From" htmlFor="origin-city" error={fieldErrors.origin}>
            <CityAutocomplete
              id="origin-city"
              value={originCity?.name || ''}
              onChange={(city) => {
                setOriginCity(city);
                setFieldErrors((e) => ({ ...e, origin: undefined }));
              }}
              placeholder="Delhi"
              mlMode={useMLPredictions}
              invalid={Boolean(fieldErrors.origin)}
            />
          </Field>
          <Field label="To" htmlFor="destination-city" error={fieldErrors.destination}>
            <CityAutocomplete
              id="destination-city"
              value={destinationCity?.name || ''}
              onChange={(city) => {
                setDestinationCity(city);
                setFieldErrors((e) => ({ ...e, destination: undefined }));
              }}
              placeholder="Goa"
              mlMode={useMLPredictions}
              invalid={Boolean(fieldErrors.destination)}
            />
          </Field>
        </div>

        {tripType === 'round-trip' ? (
          <div className="space-y-2">
            <DateRangePicker
              startDate={departureDate}
              endDate={returnDate}
              onStartDateChange={(d) => {
                setDepartureDate(d);
                setFieldErrors((e) => ({ ...e, departure: undefined }));
              }}
              onEndDateChange={(d) => {
                setReturnDate(d);
                setFieldErrors((e) => ({ ...e, return: undefined }));
              }}
            />
            {(fieldErrors.departure || fieldErrors.return) && (
              <p role="alert" className="text-xs font-medium text-neg-fg">
                {fieldErrors.departure ?? fieldErrors.return}
              </p>
            )}
          </div>
        ) : (
          <Field label="Departure date" htmlFor="departure-date" error={fieldErrors.departure}>
            <DatePicker
              date={departureDate}
              onDateChange={(d) => {
                setDepartureDate(d);
                setFieldErrors((e) => ({ ...e, departure: undefined }));
              }}
              placeholder="Select a date"
            />
          </Field>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <fieldset>
            <legend className="text-sm font-medium text-ink">Passengers</legend>
            <div className="mt-3 divide-y divide-line rounded-md border border-line">
              {passengerRows.map((row) => (
                <div key={row.key} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-ink-secondary">{row.label}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`One fewer ${row.label.toLowerCase()}`}
                      onClick={() => step(row.key, -1, row.min)}
                    >
                      <Minus className="h-3.5 w-3.5" weight="bold" />
                    </Button>
                    <output
                      aria-label={`${row.label} count`}
                      className="w-7 text-center font-mono text-sm text-ink"
                    >
                      {watch(row.key)}
                    </output>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`One more ${row.label.toLowerCase()}`}
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
              {...register('travelClass')}
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
          {loading ? 'Searching' : useMLPredictions ? 'Search and predict' : 'Search flights'}
        </Button>
      </form>
    </div>
  );
}
