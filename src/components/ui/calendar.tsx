"use client"

import * as React from "react"
import Calendar, { CalendarProps as ReactCalendarProps } from "react-calendar"
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline"
import { cn } from "@/lib/utils"
import 'react-calendar/dist/Calendar.css'

type Value = ReactCalendarProps['value']

export interface CalendarProps {
  className?: string
  value?: Date | null
  onChange?: (value: Date | null) => void
  selectRange?: boolean
  showNeighboringMonth?: boolean
  minDate?: Date
  maxDate?: Date
}

function CalendarComponent({
  className,
  value,
  onChange,
  selectRange = false,
  showNeighboringMonth = true,
  minDate,
  maxDate,
  ...props
}: CalendarProps) {
  const handleChange = (newValue: Value) => {
    if (onChange) {
      if (newValue instanceof Date) {
        onChange(newValue)
      } else if (Array.isArray(newValue) && newValue.length > 0 && newValue[0] instanceof Date) {
        onChange(newValue[0])
      } else {
        onChange(null)
      }
    }
  }

  return (
    <div className={cn("p-4 flex justify-center", className)} style={{ pointerEvents: 'auto' }}>
      <style jsx global>{`
        .react-calendar {
          width: 100%;
          max-width: 320px;
          background: white;
          border: none;
          font-family: inherit;
          line-height: 1.125em;
          pointer-events: auto;
        }
        
        .react-calendar--doubleView {
          width: 700px;
        }
        
        .react-calendar--doubleView .react-calendar__viewContainer {
          display: flex;
          margin: -0.5em;
        }
        
        .react-calendar--doubleView .react-calendar__viewContainer > * {
          width: 50%;
          margin: 0.5em;
        }
        
        .react-calendar *,
        .react-calendar *:before,
        .react-calendar *:after {
          box-sizing: border-box;
        }
        
        .react-calendar button {
          margin: 0;
          border: 0;
          outline: none;
          cursor: pointer;
          pointer-events: auto;
        }
        
        .react-calendar button:enabled:hover,
        .react-calendar button:enabled:focus {
          background-color: #f5f5f5;
        }
        
        .react-calendar__navigation {
          display: flex;
          height: 44px;
          margin-bottom: 1em;
        }
        
        .react-calendar__navigation button {
          min-width: 44px;
          background: none;
          font-size: 16px;
          font-weight: 600;
          color: #000;
        }
        
        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
          background-color: #f5f5f5;
          border-radius: 6px;
        }
        
        .react-calendar__navigation button[disabled] {
          background-color: #f0f0f0;
          color: #a3a3a3;
        }
        
        .react-calendar__navigation__label {
          font-weight: 600;
        }
        
        .react-calendar__navigation__arrow {
          flex-grow: 0;
          display: flex !important;
          align-items: center;
          justify-content: center;
          background-position: center;
          background-repeat: no-repeat;
          background-size: 16px 16px;
          border-radius: 6px;
          width: 44px;
          height: 44px;
          cursor: pointer;
          text-indent: 0 !important;
          font-size: 0 !important;
        }
        
        .react-calendar__navigation__arrow:before {
          content: '';
          display: block;
          width: 16px;
          height: 16px;
          background-position: center;
          background-repeat: no-repeat;
          background-size: contain;
        }
        
        .react-calendar__navigation__prev-button:before {
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23000'%3e%3cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M15 19l-7-7 7-7' /%3e%3c/svg%3e");
        }
        
        .react-calendar__navigation__next-button:before {
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23000'%3e%3cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M9 5l7 7-7 7' /%3e%3c/svg%3e");
        }
        
        .react-calendar__month-view__weekdays {
          text-align: center;
          text-transform: uppercase;
          font-size: 0.75rem;
          font-weight: bold;
          color: #737373;
        }
        
        .react-calendar__month-view__weekdays__weekday {
          padding: 0.5em;
        }
        
        .react-calendar__month-view__weekNumbers .react-calendar__tile {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75em;
          font-weight: bold;
          color: #737373;
        }
        
        .react-calendar__month-view__days__day--weekend {
          color: #000;
        }
        
        .react-calendar__month-view__days__day--neighboringMonth {
          color: #a3a3a3;
        }
        
        .react-calendar__year-view .react-calendar__tile,
        .react-calendar__decade-view .react-calendar__tile,
        .react-calendar__century-view .react-calendar__tile {
          padding: 2em 0.5em;
        }
        
        .react-calendar__tile {
          max-width: 100%;
          padding: 10px 6px;
          background: none;
          text-align: center;
          line-height: 16px;
          font-size: 0.875rem;
          border-radius: 6px;
          color: #000;
          cursor: pointer;
          pointer-events: auto;
          transition: background-color 0.2s ease;
        }
        
        .react-calendar__tile:disabled {
          background-color: #f0f0f0;
          color: #a3a3a3;
          cursor: not-allowed;
        }
        
        .react-calendar__tile:enabled:hover,
        .react-calendar__tile:enabled:focus {
          background-color: #f5f5f5;
          transform: none;
        }
        
        .react-calendar__tile--now {
          background: #f5f5f5;
          font-weight: 600;
        }
        
        .react-calendar__tile--now:enabled:hover,
        .react-calendar__tile--now:enabled:focus {
          background: #e5e5e5;
        }
        
        .react-calendar__tile--hasActive {
          background: #000;
          color: white;
        }
        
        .react-calendar__tile--hasActive:enabled:hover,
        .react-calendar__tile--hasActive:enabled:focus {
          background: #262626;
        }
        
        .react-calendar__tile--active {
          background: #000;
          color: white;
        }
        
        .react-calendar__tile--active:enabled:hover,
        .react-calendar__tile--active:enabled:focus {
          background: #262626;
        }
        
        .react-calendar--selectRange .react-calendar__tile--hover {
          background-color: #e5e5e5;
        }
        
        .react-calendar__month-view__days {
          display: grid !important;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }
        
        .react-calendar__month-view__weekdays {
          display: grid !important;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }
      `}</style>
      <Calendar
        value={value}
        onChange={handleChange}
        selectRange={selectRange}
        showNeighboringMonth={showNeighboringMonth}
        minDate={minDate}
        maxDate={maxDate}
        {...props}
      />
    </div>
  )
}

CalendarComponent.displayName = "Calendar"

export { CalendarComponent as Calendar }
