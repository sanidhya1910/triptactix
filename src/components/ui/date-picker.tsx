"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarBlank } from '@phosphor-icons/react/ssr'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  id?: string
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  /** Extra days to disable, on top of past days. */
  disabledDates?: (date: Date) => boolean
  /** Earliest selectable day. Defaults to today; past days are never selectable. */
  minDate?: Date
  maxDate?: Date
  name?: string
  invalid?: boolean
  "aria-describedby"?: string
}

const startOfToday = () => {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return t
}

export function DatePicker({
  id,
  date,
  onDateChange,
  placeholder = "Pick a date",
  className,
  disabled = false,
  disabledDates,
  minDate,
  maxDate,
  name,
  invalid,
  "aria-describedby": describedBy,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  // Built here but, until now, never passed to the calendar, so past dates could be picked.
  const isDisabled = React.useCallback(
    (d: Date) =>
      d < startOfToday() || (minDate !== undefined && d < minDate) || (maxDate !== undefined && d > maxDate) || !!disabledDates?.(d),
    [disabledDates, minDate, maxDate],
  )

  return (
    <div className={className}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cn(
              "h-10 w-full justify-start rounded-md border border-line-strong bg-surface text-left font-normal hover:border-ink/25 hover:bg-surface focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15",
              !date && "text-ink-tertiary",
              invalid && "border-neg-fg",
            )}
            disabled={disabled}
          >
            <CalendarBlank className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            value={date}
            onChange={(selectedDate) => {
              onDateChange?.(selectedDate || undefined)
              setIsOpen(false)
            }}
            minDate={minDate && minDate > startOfToday() ? minDate : startOfToday()}
            maxDate={maxDate}
            tileDisabled={isDisabled}
            className="rounded-md border-0"
          />
        </PopoverContent>
      </Popover>
      {name && <input type="hidden" name={name} value={date ? format(date, "yyyy-MM-dd") : ""} />}
    </div>
  )
}

interface DateRangePickerProps {
  startDate?: Date
  endDate?: Date
  onStartDateChange?: (date: Date | undefined) => void
  onEndDateChange?: (date: Date | undefined) => void
  startPlaceholder?: string
  endPlaceholder?: string
  className?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
  startError?: string
  endError?: string
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startPlaceholder = "Departure date",
  endPlaceholder = "Return date",
  className,
  disabled = false,
  minDate,
  maxDate,
  startError,
  endError,
}: DateRangePickerProps) {
  const id = React.useId()

  const handleStartDateChange = (date: Date | undefined) => {
    onStartDateChange?.(date)
    // A return date before the new departure date is no longer valid.
    if (date && endDate && endDate < date) onEndDateChange?.(undefined)
  }

  return (
    <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2", className)}>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-start`} className="text-sm font-medium text-ink">
          Departure date
        </label>
        <DatePicker
          id={`${id}-start`}
          date={startDate}
          onDateChange={handleStartDateChange}
          placeholder={startPlaceholder}
          disabled={disabled}
          minDate={minDate}
          maxDate={maxDate}
          name="departureDate"
          invalid={!!startError}
          aria-describedby={startError ? `${id}-start-error` : undefined}
        />
        {startError && (
          <p id={`${id}-start-error`} role="alert" className="text-xs font-medium text-neg-fg">
            {startError}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-end`} className="text-sm font-medium text-ink">
          Return date
        </label>
        <DatePicker
          id={`${id}-end`}
          date={endDate}
          onDateChange={onEndDateChange}
          placeholder={endPlaceholder}
          disabled={disabled}
          // The return can be the same day as departure, never before it.
          minDate={startDate ?? minDate}
          maxDate={maxDate}
          name="returnDate"
          invalid={!!endError}
          aria-describedby={endError ? `${id}-end-error` : undefined}
        />
        {endError && (
          <p id={`${id}-end-error`} role="alert" className="text-xs font-medium text-neg-fg">
            {endError}
          </p>
        )}
      </div>
    </div>
  )
}
