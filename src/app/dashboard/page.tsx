'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/layout/Navbar';
import { 
  PlusIcon,
  MapPinIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  PaperAirplaneIcon,
  BuildingOfficeIcon,
  CurrencyRupeeIcon,
  StarIcon,
  EyeIcon,
  TrashIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  budget: number;
  travelers: number;
  image?: string;
}

const sampleTrips: Trip[] = [
  {
    id: '1',
    title: 'Mumbai Business Trip',
    destination: 'Mumbai, India',
    startDate: '2024-02-15',
    endDate: '2024-02-18',
    status: 'upcoming',
    budget: 25000,
    travelers: 1
  },
  {
    id: '2',
    title: 'Goa Vacation',
    destination: 'Goa, India',
    startDate: '2024-01-20',
    endDate: '2024-01-25',
    status: 'completed',
    budget: 45000,
    travelers: 2
  },
  {
    id: '3',
    title: 'Kerala Backwaters',
    destination: 'Kochi, India',
    startDate: '2024-03-10',
    endDate: '2024-03-17',
    status: 'upcoming',
    budget: 35000,
    travelers: 4
  }
];

export default function DashboardPage() {
  const [trips, setTrips] = useState<Trip[]>(sampleTrips);
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'completed'>('all');

  const filteredTrips = trips.filter(trip => {
    if (activeTab === 'all') return true;
    return trip.status === activeTab;
  });

  const stats = {
    totalTrips: trips.length,
    upcomingTrips: trips.filter(t => t.status === 'upcoming').length,
    completedTrips: trips.filter(t => t.status === 'completed').length,
    totalSpent: trips.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.budget, 0)
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-neutral-100 text-neutral-800 border-neutral-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar currentPage="dashboard" showGetStarted={false} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-black">Your Trips</h1>
            <p className="text-neutral-600 mt-2">Manage and track all your travel plans</p>
          </div>
          <Button size="lg" className="px-6">
            <PlusIcon className="w-5 h-5 mr-2" />
            Plan New Trip
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600">Total Trips</p>
                  <p className="text-2xl font-bold text-black">{stats.totalTrips}</p>
                </div>
                <div className="w-12 h-12 bg-neutral-100 rounded-lg flex items-center justify-center">
                  <MapPinIcon className="w-6 h-6 text-neutral-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600">Upcoming</p>
                  <p className="text-2xl font-bold text-black">{stats.upcomingTrips}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CalendarDaysIcon className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600">Completed</p>
                  <p className="text-2xl font-bold text-black">{stats.completedTrips}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <StarIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600">Total Spent</p>
                  <p className="text-2xl font-bold text-black">₹{stats.totalSpent.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <CurrencyRupeeIcon className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-neutral-100 p-1 rounded-lg mb-8 w-fit">
          <Button
            variant={activeTab === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('all')}
            className="min-w-[80px]"
          >
            All
          </Button>
          <Button
            variant={activeTab === 'upcoming' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('upcoming')}
            className="min-w-[80px]"
          >
            Upcoming
          </Button>
          <Button
            variant={activeTab === 'completed' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('completed')}
            className="min-w-[80px]"
          >
            Completed
          </Button>
        </div>

        {/* Trips Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrips.map((trip) => (
            <Card key={trip.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{trip.title}</CardTitle>
                    <p className="text-neutral-600 text-sm mt-1 flex items-center">
                      <MapPinIcon className="w-4 h-4 mr-1" />
                      {trip.destination}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(trip.status)}`}>
                    {trip.status}
                  </span>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-neutral-600">
                    <CalendarDaysIcon className="w-4 h-4 mr-2" />
                    {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-neutral-600">
                      <UserIcon className="w-4 h-4 mr-1" />
                      {trip.travelers} {trip.travelers === 1 ? 'Traveler' : 'Travelers'}
                    </div>
                    <div className="font-semibold text-black">
                      ₹{trip.budget.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 pt-3">
                    <Button variant="outline" size="sm" className="flex-1">
                      <EyeIcon className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <PencilIcon className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTrips.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPinIcon className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              No trips found
            </h3>
            <p className="text-neutral-600 mb-6">
              {activeTab === 'all' 
                ? "You haven't planned any trips yet. Start by creating your first trip!"
                : `No ${activeTab} trips found.`}
            </p>
            <Button>
              <PlusIcon className="w-5 h-5 mr-2" />
              Plan Your First Trip
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
