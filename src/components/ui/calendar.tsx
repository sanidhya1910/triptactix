"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-[280px]",
        caption: "flex justify-center pt-1 relative items-center mb-4",
        caption_label: "text-sm font-semibold text-gray-900",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-neutral-100 rounded-md inline-flex items-center justify-center"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "grid grid-cols-7 gap-0 mb-2",
        head_cell: "text-neutral-500 font-normal text-[0.8rem] h-10 flex items-center justify-center",
        row: "grid grid-cols-7 gap-0 mt-1",
        cell: "h-10 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day: cn(
          "h-10 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-neutral-100 rounded-md inline-flex items-center justify-center text-sm ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        ),
        day_selected:
          "bg-black text-white hover:bg-black hover:text-white focus:bg-black focus:text-white",
        day_today: "bg-neutral-100 text-black font-semibold",
        day_outside:
          "text-neutral-400 opacity-50 aria-selected:bg-neutral-100/50 aria-selected:text-neutral-400 aria-selected:opacity-30",
        day_disabled: "text-neutral-400 opacity-50",
        day_range_middle:
          "aria-selected:bg-neutral-100 aria-selected:text-black",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: (props) => {
          if (props.orientation === "left") {
            return <ChevronLeftIcon className="h-4 w-4" />
          }
          return <ChevronRightIcon className="h-4 w-4" />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
