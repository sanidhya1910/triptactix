"use client"

import React, { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { DatePicker } from '@/components/ui/date-picker'

export default function CalendarTestPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [pickerDate, setPickerDate] = useState<Date | undefined>(undefined)

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Calendar Component Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Direct Calendar Component Test */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Direct Calendar Component</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Selected: {selectedDate ? selectedDate.toDateString() : 'None'}
              </p>
            </div>
            <Calendar
              value={selectedDate}
              onChange={(date) => {
                console.log('Direct calendar change:', date)
                setSelectedDate(date)
              }}
            />
          </div>

          {/* Date Picker Component Test */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">DatePicker Component (Popover)</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Selected: {pickerDate ? pickerDate.toDateString() : 'None'}
              </p>
            </div>
            <DatePicker
              date={pickerDate}
              onDateChange={(date) => {
                console.log('DatePicker change:', date)
                setPickerDate(date)
              }}
              placeholder="Click to select a date"
            />
          </div>
        </div>

        {/* Debug Info */}
        <div className="max-w-4xl mx-auto mt-8 bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Debug Information</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Direct Calendar Value:</strong> {selectedDate ? selectedDate.toISOString() : 'null'}</p>
            <p><strong>DatePicker Value:</strong> {pickerDate ? pickerDate.toISOString() : 'undefined'}</p>
            <p><strong>Instructions:</strong> Try clicking on dates in both calendars above. Check the browser console for change events.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
