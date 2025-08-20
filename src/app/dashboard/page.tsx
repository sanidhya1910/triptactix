'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ModernLayout } from '@/components/layout/ModernLayout';
import { AnimatedSection, FadeInWhenVisible, StaggeredContainer } from '@/components/ui/animations';
import { ModernCard } from '@/components/ui/modern-card';
import { StatusBadge, PriceBadge, ModernBadge } from '@/components/ui/modern-badge';
import { Booking } from '@/types/user';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  PaperAirplaneIcon,
  BuildingOffice2Icon,
  Squares2X2Icon,
  PlusIcon,
} from '@heroicons/react/24/outline';

interface BookingCardProps {
  booking: Booking;
  onCancel: (bookingId: string) => void;
  onModify: (bookingId: string) => void;
}

function BookingCard({ booking, onCancel, onModify }: BookingCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <StatusBadge status="confirmed" />;
      case 'pending':
        return <StatusBadge status="pending" />;
      case 'cancelled':
        return <StatusBadge status="cancelled" />;
      case 'completed':
        return <StatusBadge status="completed" />;
      default:
        return <StatusBadge status="pending" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'flight':
        return <PaperAirplaneIcon className="w-6 h-6" />;
      case 'train':
        return <BuildingOffice2Icon className="w-6 h-6" />;
      case 'hotel':
        return <BuildingOffice2Icon className="w-6 h-6" />;
      case 'package':
        return <DocumentTextIcon className="w-6 h-6" />;
      default:
        return <DocumentTextIcon className="w-6 h-6" />;
    }
  };

  const getTypeGradient = (type: string) => {
    switch (type) {
      case 'flight':
        return 'from-blue-500 to-blue-600';
      case 'train':
        return 'from-purple-500 to-purple-600';
      case 'hotel':
        return 'from-green-500 to-green-600';
      case 'package':
        return 'from-orange-500 to-orange-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <FadeInWhenVisible>
      <ModernCard className="group hover:scale-[1.02] transition-all duration-300 overflow-hidden">
        {/* Header with gradient bar */}
        <div className={`h-2 bg-gradient-to-r ${getTypeGradient(booking.type)}`}></div>
        
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${getTypeGradient(booking.type)} rounded-2xl flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300`}>
                {getTypeIcon(booking.type)}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">{booking.reference}</h3>
                <p className="text-sm text-neutral-600 capitalize">{booking.type} Booking</p>
              </div>
            </div>
            {getStatusBadge(booking.status)}
          </div>

          {/* Travel Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <CalendarIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <span className="text-neutral-500">Travel Date</span>
                <p className="font-medium text-neutral-900">{formatDate(booking.travelDate)}</p>
              </div>
            </div>
            
            {booking.returnDate && (
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                  <CalendarIcon className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <span className="text-neutral-500">Return Date</span>
                  <p className="font-medium text-neutral-900">{formatDate(booking.returnDate)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Booking Date */}
          <div className="flex items-center space-x-3 text-sm">
            <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
              <ClockIcon className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <span className="text-neutral-500">Booked on</span>
              <p className="font-medium text-neutral-900">{formatDate(booking.bookingDate)}</p>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-gradient-to-br from-neutral-50 to-neutral-100/50 backdrop-blur-sm rounded-2xl p-4 border border-neutral-200/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-neutral-600">Total Amount</span>
              <PriceBadge amount={booking.payment.amount.total} currency={booking.payment.amount.currency} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-600">Payment Status</span>
              <span className={`text-sm font-medium capitalize ${
                booking.payment.status === 'completed' ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {booking.payment.status}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onModify(booking.id)}
              disabled={booking.status === 'cancelled' || booking.status === 'completed'}
              className="flex-1 group hover:scale-105 transition-transform duration-200"
            >
              <DocumentTextIcon className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
              Modify
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel(booking.id)}
              disabled={booking.status === 'cancelled' || booking.status === 'completed'}
              className="flex-1 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:scale-105 transition-all duration-200"
            >
              Cancel
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 hover:scale-105 transition-transform duration-200"
            >
              View Details
            </Button>
          </div>
        </div>
      </ModernCard>
    </FadeInWhenVisible>
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
            amount: { total: 45000, currency: 'INR' },
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
            amount: { total: 36000, currency: 'INR' },
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
      <ModernLayout>
        <div className="min-h-screen flex items-center justify-center">
          <AnimatedSection className="text-center">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg font-medium text-neutral-600">Loading your dashboard...</p>
          </AnimatedSection>
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <AnimatedSection>
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mr-4">
                <Squares2X2Icon className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                My Dashboard
              </h1>
            </div>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Manage your travel bookings and view trip details
            </p>
          </div>
        </AnimatedSection>

        {/* Stats Cards */}
        <StaggeredContainer className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <FadeInWhenVisible>
            <ModernCard className="group hover:scale-105 transition-transform duration-300">
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Squares2X2Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">
                  {stats.total}
                </div>
                <div className="text-sm text-neutral-600">Total Bookings</div>
              </div>
            </ModernCard>
          </FadeInWhenVisible>
          
          <FadeInWhenVisible>
            <ModernCard className="group hover:scale-105 transition-transform duration-300">
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <PaperAirplaneIcon className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent mb-2">
                  {stats.upcoming}
                </div>
                <div className="text-sm text-neutral-600">Upcoming Trips</div>
              </div>
            </ModernCard>
          </FadeInWhenVisible>
          
          <FadeInWhenVisible>
            <ModernCard className="group hover:scale-105 transition-transform duration-300">
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <DocumentTextIcon className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-gray-600 to-gray-800 bg-clip-text text-transparent mb-2">
                  {stats.completed}
                </div>
                <div className="text-sm text-neutral-600">Completed</div>
              </div>
            </ModernCard>
          </FadeInWhenVisible>
          
          <FadeInWhenVisible>
            <ModernCard className="group hover:scale-105 transition-transform duration-300">
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <ClockIcon className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent mb-2">
                  {stats.cancelled}
                </div>
                <div className="text-sm text-neutral-600">Cancelled</div>
              </div>
            </ModernCard>
          </FadeInWhenVisible>
        </StaggeredContainer>

        {/* Filter Tabs */}
        <AnimatedSection>
          <div className="flex space-x-1 bg-white/80 backdrop-blur-sm rounded-2xl p-2 mb-12 shadow-sm border border-neutral-200/50">
            {[
              { key: 'all', label: 'All Bookings', count: stats.total },
              { key: 'upcoming', label: 'Upcoming', count: stats.upcoming },
              { key: 'past', label: 'Past', count: stats.completed },
              { key: 'cancelled', label: 'Cancelled', count: stats.cancelled },
            ].map((tab) => (
              <Button
                key={tab.key}
                variant={filter === tab.key ? 'default' : 'ghost'}
                onClick={() => setFilter(tab.key as any)}
                className={`flex-1 transition-all duration-300 ${
                  filter === tab.key 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 scale-105' 
                    : 'hover:bg-neutral-100 hover:scale-105'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      filter === tab.key 
                        ? 'bg-white/20 text-white' 
                        : 'bg-neutral-200 text-neutral-700'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </span>
              </Button>
            ))}
          </div>
        </AnimatedSection>

        {/* Bookings List */}
        {filteredBookings.length > 0 ? (
          <StaggeredContainer className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancel={handleCancelBooking}
                onModify={handleModifyBooking}
              />
            ))}
          </StaggeredContainer>
        ) : (
          <AnimatedSection>
            <ModernCard className="text-center p-12">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <PaperAirplaneIcon className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-3">
                {filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}
              </h3>
              <p className="text-neutral-600 mb-8 max-w-md mx-auto">
                {filter === 'all' 
                  ? "You haven't made any bookings yet. Start planning your next adventure and create unforgettable memories!"
                  : `No ${filter} bookings to show. Try switching to a different filter.`
                }
              </p>
              <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-3 rounded-2xl font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                <PlusIcon className="w-5 h-5 mr-2" />
                Search for Trips
              </Button>
            </ModernCard>
          </AnimatedSection>
        )}
      </div>
    </ModernLayout>
  );
}
