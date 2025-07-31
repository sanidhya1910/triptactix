'use client';

import { useState } from 'react';
import { type Itinerary, type ItineraryDay, type Activity } from '@/types/itinerary';
import { 
  CalendarDaysIcon, 
  MapPinIcon, 
  CurrencyDollarIcon,
  ClockIcon,
  StarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SunIcon,
  MoonIcon,
  BuildingStorefrontIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import React from 'react';

interface ItineraryDisplayProps {
  itinerary: Itinerary;
  onBookNow?: () => void;
}

export function ItineraryDisplay({ itinerary, onBookNow }: ItineraryDisplayProps) {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [activeTab, setActiveTab] = useState<'overview' | 'daily' | 'tips'>('overview');

  const toggleDay = (dayNumber: number) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dayNumber)) {
      newExpanded.delete(dayNumber);
    } else {
      newExpanded.add(dayNumber);
    }
    setExpandedDays(newExpanded);
  };

  const getTimeIcon = (timeSlot: string) => {
    switch (timeSlot) {
      case 'morning':
        return <SunIcon className="w-4 h-4 text-yellow-500" />;
      case 'afternoon':
        return <SunIcon className="w-4 h-4 text-orange-500" />;
      case 'evening':
        return <MoonIcon className="w-4 h-4 text-purple-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-neutral-900" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'sightseeing':
        return <MapPinIcon className="w-4 h-4" />;
      case 'cultural':
        return <BuildingStorefrontIcon className="w-4 h-4" />;
      default:
        return <StarIcon className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl border-2 border-neutral-900 overflow-hidden">
      {/* Header */}
      <div className="bg-primary-600 text-white p-6 border-b-2 border-neutral-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-black text-neutral-900 mb-2">
              {itinerary.destination} Adventure
            </h1>
            <p className="text-white mt-1 font-bold text-neutral-900 mb-2">
              {itinerary.duration} days • {new Date(itinerary.startDate).toLocaleDateString()} - {new Date(itinerary.endDate).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-neutral-900 mb-2">₹{itinerary.totalCost.toLocaleString()}</div>
            <div className="text-white text-sm font-bold">Total Cost</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b-2 border-neutral-900 bg-neutral-50">
        <div className="flex">
          {[
            { id: 'overview', label: 'Overview', icon: StarIcon },
            { id: 'daily', label: 'Daily Plan', icon: CalendarDaysIcon },
            { id: 'tips', label: 'Tips & Info', icon: MapPinIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 font-bold transition-colors border-2 border-transparent relative overflow-hidden ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white border-2 border-blue-600 shadow-lg'
                  : 'text-neutral-900 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              {/* Travel-themed background icons for active tab */}
              {activeTab === tab.id && (
                <div className="absolute inset-0 opacity-10">
                  <PaperAirplaneIcon className="absolute top-1 right-2 w-4 h-4 rotate-12" />
                  <MapPinIcon className="absolute bottom-1 left-2 w-3 h-3 -rotate-12" />
                  <CalendarDaysIcon className="absolute top-2 left-8 w-3 h-3 rotate-45" />
                </div>
              )}
              <tab.icon className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 text-center border-2 border-primary-600">
                <div className="text-2xl font-black text-primary-600">
                  {itinerary.summary.totalActivities}
                </div>
                <div className="text-sm text-neutral-900 font-bold">Activities</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border-2 border-secondary-600">
                <div className="text-2xl font-black text-secondary-600">
                  {itinerary.summary.totalMeals}
                </div>
                <div className="text-sm text-neutral-900 font-bold">Meals</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border-2 border-accent-500">
                <div className="text-2xl font-black text-accent-500">
                  ₹{Math.round(itinerary.summary.avgDailyCost)}
                </div>
                <div className="text-sm text-neutral-900 font-bold">Avg/Day</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border-2 border-neutral-900">
                <div className="text-2xl font-black text-neutral-900">
                  {itinerary.duration}
                </div>
                <div className="text-sm text-neutral-900 font-bold">Days</div>
              </div>
            </div>

            {/* Highlights */}
            <div>
              <h3 className="text-lg font-black text-neutral-900 mb-3">
                Trip Highlights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {itinerary.summary.highlights.map((highlight, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-primary-600"
                  >
                    <StarIcon className="w-5 h-5 text-primary-600 flex-shrink-0" />
                    <span className="text-sm font-bold text-neutral-900">
                      {highlight}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Transportation Summary */}
            <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
              <h3 className="text-lg font-black text-neutral-900 mb-3">
                Transportation Costs
              </h3>
              <div className="space-y-2">
                {itinerary.days.flatMap(day => day.transportation || []).map((transport, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PaperAirplaneIcon className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-bold text-neutral-900">
                        {transport.type} - {transport.from} to {transport.to}
                      </span>
                    </div>
                    <span className="text-sm font-black text-blue-600">₹{transport.cost}</span>
                  </div>
                ))}
                <div className="border-t-2 border-blue-300 pt-2 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-neutral-900">Total Transportation:</span>
                    <span className="text-lg font-black text-blue-600">
                      ₹{itinerary.days.flatMap(day => day.transportation || [])
                        .reduce((sum, transport) => sum + transport.cost, 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Weather Info */}
            {itinerary.summary.weatherInfo && (
              <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                <h3 className="text-lg font-black text-neutral-900 mb-2">
                  Weather & Packing
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-black text-neutral-900">Temperature:</span>
                    <p className="text-neutral-900 font-bold">{itinerary.summary.weatherInfo.temperature}</p>
                  </div>
                  <div>
                    <span className="font-black text-neutral-900">Conditions:</span>
                    <p className="text-neutral-900 font-bold">{itinerary.summary.weatherInfo.conditions}</p>
                  </div>
                  <div>
                    <span className="font-black text-neutral-900">Recommendation:</span>
                    <p className="text-neutral-900 font-bold">{itinerary.summary.weatherInfo.recommendation}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Daily Plan Tab */}
        {activeTab === 'daily' && (
          <div className="space-y-4">
            {itinerary.days.map((day) => (
              <DayCard
                key={day.day}
                day={day}
                isExpanded={expandedDays.has(day.day)}
                onToggle={() => toggleDay(day.day)}
                getTimeIcon={getTimeIcon}
                getCategoryIcon={getCategoryIcon}
              />
            ))}
          </div>
        )}

        {/* Tips & Info Tab */}
        {activeTab === 'tips' && (
          <div className="space-y-6">
            {/* Travel Tips */}
            <div>
              <h3 className="text-lg font-black text-neutral-900 mb-3">
                Travel Tips
              </h3>
              <div className="space-y-2">
                {itinerary.tips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border-2 border-neutral-900">
                    <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-white">{index + 1}</span>
                    </div>
                    <span className="text-sm font-bold text-neutral-900">{tip}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Emergency Information */}
            <div>
              <h3 className="text-lg font-black text-neutral-900 mb-3">
                Emergency Information
              </h3>
              <div className="bg-white border-2 border-accent-500 rounded-lg p-4 space-y-3">
                <div>
                  <span className="font-black text-accent-500">Embassy:</span>
                  <p className="text-neutral-900 font-bold">{itinerary.emergencyInfo.embassy}</p>
                </div>
                <div>
                  <span className="font-black text-accent-500">Hospitals:</span>
                  <ul className="text-neutral-900 ml-4 font-bold">
                    {itinerary.emergencyInfo.hospitals.map((hospital, index) => (
                      <li key={index} className="list-disc">{hospital}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="font-black text-accent-500">Emergency Numbers:</span>
                  <ul className="text-neutral-900 ml-4 font-bold">
                    {itinerary.emergencyInfo.emergencyNumbers.map((number, index) => (
                      <li key={index} className="list-disc">{number}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Book Now Button */}
        {onBookNow && (
          <div className="mt-8 pt-6 border-t border-neutral-200">
            <Button
              onClick={onBookNow}
              className="w-full bg-blue-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-blue-700 transition-all duration-200"
            >
              <div className="flex items-center justify-center gap-2">
                <PaperAirplaneIcon className="w-5 h-5" />
                Book This Itinerary - ₹{itinerary.totalCost.toLocaleString()}
              </div>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

interface DayCardProps {
  day: ItineraryDay;
  isExpanded: boolean;
  onToggle: () => void;
  getTimeIcon: (timeSlot: string) => React.ReactElement;
  getCategoryIcon: (category: string) => React.ReactElement;
}

function DayCard({ day, isExpanded, onToggle, getTimeIcon, getCategoryIcon }: DayCardProps) {
  return (
    <div className="border-2 border-neutral-900 rounded-lg overflow-hidden bg-white">
      <button
        onClick={onToggle}
        className="w-full p-4 bg-neutral-100 hover:bg-neutral-200 transition-colors flex items-center justify-between border-b-2 border-neutral-900"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center border-2 border-neutral-900">
            <span className="font-black text-white">{day.day}</span>
          </div>
          <div className="text-left">
            <h3 className="font-black text-neutral-900">
              Day {day.day}
            </h3>
            <p className="text-sm text-neutral-900 font-bold">
              {new Date(day.date).toLocaleDateString()} • ₹{day.estimatedCost}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="w-5 h-5 text-neutral-900" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-neutral-900" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4 bg-white">
          {/* Activities */}
          <div>
            <h4 className="font-black text-neutral-900 mb-3">Activities</h4>
            <div className="space-y-3">
              {day.activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  getTimeIcon={getTimeIcon}
                  getCategoryIcon={getCategoryIcon}
                />
              ))}
            </div>
          </div>

          {/* Meals */}
          <div>
            <h4 className="font-black text-neutral-900 mb-3">Meals</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {day.meals.map((meal) => (
                <div
                  key={meal.id}
                  className="p-3 bg-white rounded-lg border-2 border-neutral-900"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-sm text-neutral-900 capitalize">
                      {meal.mealType}
                    </span>
                    <span className="text-sm font-black text-primary-600">
                      ₹{meal.cost}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-900 font-bold">{meal.name}</p>
                  <p className="text-xs text-neutral-900 font-bold">{meal.restaurant}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Transportation */}
          {day.transportation && day.transportation.length > 0 && (
            <div>
              <h4 className="font-black text-neutral-900 mb-3">Transportation</h4>
              <div className="space-y-2">
                {day.transportation.map((transport) => (
                  <div
                    key={transport.id}
                    className="p-3 bg-blue-50 rounded-lg border-2 border-blue-200"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <PaperAirplaneIcon className="w-4 h-4 text-blue-600" />
                        <span className="font-black text-sm text-neutral-900 capitalize">
                          {transport.type}
                        </span>
                      </div>
                      <span className="text-sm font-black text-blue-600">
                        ₹{transport.cost}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-900 font-bold">
                      {transport.from} → {transport.to}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-neutral-900 font-bold mt-1">
                      <span>{transport.departure} - {transport.arrival}</span>
                      <span>{transport.duration}</span>
                      {transport.provider && <span>{transport.provider}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accommodation */}
          {day.accommodation && (
            <div>
              <h4 className="font-black text-neutral-900 mb-3">Accommodation</h4>
              <div className="p-3 bg-white rounded-lg border-2 border-neutral-900">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-neutral-900">{day.accommodation.name}</span>
                  <span className="text-sm font-black text-primary-600">
                    ₹{day.accommodation.cost}/night
                  </span>
                </div>
                <p className="text-sm text-neutral-900 font-bold">{day.accommodation.location}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StarIcon className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-neutral-900 font-bold">{day.accommodation.rating}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ActivityCardProps {
  activity: Activity;
  getTimeIcon: (timeSlot: string) => React.ReactElement;
  getCategoryIcon: (category: string) => React.ReactElement;
}

function ActivityCard({ activity, getTimeIcon, getCategoryIcon }: ActivityCardProps) {
  return (
    <div className="p-3 bg-white rounded-lg border-2 border-neutral-900">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {getTimeIcon(activity.timeSlot)}
            {getCategoryIcon(activity.category)}
            <span className="font-black text-neutral-900">{activity.name}</span>
          </div>
          <p className="text-sm text-neutral-900 mb-1 font-bold">{activity.description}</p>
          <div className="flex items-center gap-4 text-xs text-neutral-900 font-bold">
            <span className="flex items-center gap-1">
              <MapPinIcon className="w-3 h-3" />
              {activity.location}
            </span>
            <span className="flex items-center gap-1">
              <ClockIcon className="w-3 h-3" />
              {activity.duration}
            </span>
          </div>
        </div>
        <span className="text-sm font-black text-primary-600 ml-3">
          ₹{activity.cost}
        </span>
      </div>
      
      {activity.tips && activity.tips.length > 0 && (
        <div className="mt-2 pt-2 border-t-2 border-neutral-900">
          <p className="text-xs font-black text-neutral-900 mb-1">Tips:</p>
          <ul className="text-xs text-neutral-900 space-y-0.5 font-bold">
            {activity.tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-1">
                <span className="text-primary-600 font-black">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
