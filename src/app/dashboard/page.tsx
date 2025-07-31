'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Booking } from '@/types/user';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface BookingCardProps {
  booking: Booking;
  onCancel: (bookingId: string) => void;
  onModify: (bookingId: string) => void;
}

function BookingCard({ booking, onCancel, onModify }: BookingCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'flight':
        return '✈️';
      case 'train':
        return '🚂';
      case 'hotel':
        return '🏨';
      case 'package':
        return '📦';
      default:
        return '📋';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getTypeIcon(booking.type)}</span>
            <div>
              <CardTitle className="text-lg">{booking.reference}</CardTitle>
              <p className="text-sm text-gray-600 capitalize">{booking.type} Booking</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
            {booking.status.toUpperCase()}
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Travel Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2 text-sm">
            <CalendarIcon className="w-4 h-4 text-gray-500" />
            <span>Travel: {formatDate(booking.travelDate)}</span>
          </div>
          {booking.returnDate && (
            <div className="flex items-center space-x-2 text-sm">
              <CalendarIcon className="w-4 h-4 text-gray-500" />
              <span>Return: {formatDate(booking.returnDate)}</span>
            </div>
          )}
        </div>

        {/* Booking Date */}
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <ClockIcon className="w-4 h-4" />
          <span>Booked on {formatDate(booking.bookingDate)}</span>
        </div>

        {/* Payment Info */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Amount</span>
            <span className="text-lg font-bold text-green-600">
              {formatCurrency(booking.payment.amount.total, booking.payment.amount.currency)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-600 mt-1">
            <span>Payment Status</span>
            <span className={`capitalize ${
              booking.payment.status === 'completed' ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {booking.payment.status}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onModify(booking.id)}
            disabled={booking.status === 'cancelled' || booking.status === 'completed'}
          >
            <DocumentTextIcon className="w-4 h-4 mr-1" />
            Modify
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCancel(booking.id)}
            disabled={booking.status === 'cancelled' || booking.status === 'completed'}
            className="text-red-600 hover:text-red-700"
          >
            Cancel
          </Button>
          <Button variant="outline" size="sm">
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('all');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      // In a real app, this would fetch from your API
      // For now, we'll use mock data
      const mockBookings: Booking[] = [
        {
          id: 'booking-1',
          userId: 'user-1',
          type: 'flight',
          status: 'confirmed',
          reference: 'TRX123456',
          bookingDate: new Date('2025-01-15'),
          travelDate: new Date('2025-02-15'),
          returnDate: new Date('2025-02-22'),
          details: {
            type: 'flight',
            flightId: 'flight-1',
            passengers: [],
            seats: [],
            baggage: [],
          } as any,
          payment: {
            id: 'pay-1',
            method: 'card',
            status: 'completed',
            amount: { total: 599, currency: 'USD' },
            transactionId: 'txn-123',
            processedAt: new Date('2025-01-15'),
          },
          modifications: [],
        },
        {
          id: 'booking-2',
          userId: 'user-1',
          type: 'hotel',
          status: 'pending',
          reference: 'HTL789012',
          bookingDate: new Date('2025-01-20'),
          travelDate: new Date('2025-03-01'),
          returnDate: new Date('2025-03-05'),
          details: {
            type: 'hotel',
            hotelId: 'hotel-1',
            roomId: 'room-1',
            guests: [],
            checkIn: new Date('2025-03-01'),
            checkOut: new Date('2025-03-05'),
            nights: 4,
          } as any,
          payment: {
            id: 'pay-2',
            method: 'card',
            status: 'pending',
            amount: { total: 480, currency: 'USD' },
            transactionId: 'txn-456',
          },
          modifications: [],
        },
      ];
      
      setBookings(mockBookings);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    // In a real app, this would call your API
    console.log('Cancel booking:', bookingId);
    // Update local state
    setBookings(bookings.map(booking => 
      booking.id === bookingId 
        ? { ...booking, status: 'cancelled' as const }
        : booking
    ));
  };

  const handleModifyBooking = (bookingId: string) => {
    // In a real app, this would navigate to a modification form
    console.log('Modify booking:', bookingId);
  };

  const filteredBookings = bookings.filter(booking => {
    const now = new Date();
    switch (filter) {
      case 'upcoming':
        return booking.travelDate > now && booking.status !== 'cancelled';
      case 'past':
        return booking.travelDate <= now || booking.status === 'completed';
      case 'cancelled':
        return booking.status === 'cancelled';
      default:
        return true;
    }
  });

  const stats = {
    total: bookings.length,
    upcoming: bookings.filter(b => b.travelDate > new Date() && b.status !== 'cancelled').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
          <p className="text-gray-600">Manage your travel bookings and view trip details</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Bookings</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-600">{stats.upcoming}</div>
              <div className="text-sm text-gray-600">Upcoming Trips</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-gray-600">{stats.completed}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-red-600">{stats.cancelled}</div>
              <div className="text-sm text-gray-600">Cancelled</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-white rounded-lg p-1 mb-8 shadow-sm">
          {[
            { key: 'all', label: 'All Bookings' },
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'past', label: 'Past' },
            { key: 'cancelled', label: 'Cancelled' },
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={filter === tab.key ? 'default' : 'ghost'}
              onClick={() => setFilter(tab.key as any)}
              className="flex-1"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Bookings List */}
        {filteredBookings.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancel={handleCancelBooking}
                onModify={handleModifyBooking}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">✈️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No bookings found</h3>
              <p className="text-gray-600 mb-6">
                {filter === 'all' 
                  ? "You haven't made any bookings yet. Start planning your next adventure!"
                  : `No ${filter} bookings to show.`
                }
              </p>
              <Button className="bg-blue-600 hover:bg-blue-700">
                Search for Trips
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
