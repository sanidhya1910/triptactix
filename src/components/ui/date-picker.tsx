"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "@heroicons/react/24/outline"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  disabledDates?: (date: Date) => boolean
  minDate?: Date
  maxDate?: Date
  name?: string
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  className,
  disabled = false,
  disabledDates,
  minDate,
  maxDate,
  name,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  // Default disabled function that prevents selecting dates before today
  const defaultDisabledDates = React.useCallback((date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let isDisabled = date < today
    
    if (minDate) {
      isDisabled = isDisabled || date < minDate
    }
    
    if (maxDate) {
      isDisabled = isDisabled || date > maxDate
    }
    
    if (disabledDates) {
      isDisabled = isDisabled || disabledDates(date)
    }
    
    return isDisabled
  }, [disabledDates, minDate, maxDate])

  return (
    <div className={className}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full h-12 justify-start text-left font-normal rounded-xl border-2 border-neutral-200 focus:border-black bg-white hover:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-200",
              !date && "text-neutral-500"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(selectedDate) => {
              onDateChange?.(selectedDate)
              setIsOpen(false)
            }}
            disabled={defaultDisabledDates}
            initialFocus
            className="rounded-md border-0"
          />
        </PopoverContent>
      </Popover>
      {name && (
        <input
          type="hidden"
          name={name}
          value={date ? format(date, "yyyy-MM-dd") : ""}
        />
      )}
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
}: DateRangePickerProps) {
  const handleStartDateChange = (date: Date | undefined) => {
    onStartDateChange?.(date)
    // If end date is before new start date, clear it
    if (date && endDate && endDate < date) {
      onEndDateChange?.(undefined)
    }
  }

  const endDateDisabled = React.useCallback((date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let isDisabled = date < today
    
    // End date cannot be before start date
    if (startDate) {
      isDisabled = isDisabled || date < startDate
    }
    
    if (minDate) {
      isDisabled = isDisabled || date < minDate
    }
    
    if (maxDate) {
      isDisabled = isDisabled || date > maxDate
    }
    
    return isDisabled
  }, [startDate, minDate, maxDate])

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", className)}>
      <div className="space-y-2">
        <label className="text-sm font-bold text-black">Departure Date</label>
        <DatePicker
          date={startDate}
          onDateChange={handleStartDateChange}
          placeholder={startPlaceholder}
          disabled={disabled}
          minDate={minDate}
          maxDate={maxDate}
          name="departureDate"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-black">Return Date</label>
        <DatePicker
          date={endDate}
          onDateChange={onEndDateChange}
          placeholder={endPlaceholder}
          disabled={disabled}
          disabledDates={endDateDisabled}
          name="returnDate"
        />
      </div>
    </div>
  )
}
