'use client';

import React from 'react';
import { Hotel, HotelRoom } from '@/types/travel';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { 
  StarIcon,
  MapPinIcon,
  WifiIcon,
  TvIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface HotelCardProps {
  hotel: Hotel;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  onSelectRoom: (hotel: Hotel, room: HotelRoom) => void;
}

export function HotelCard({ hotel, checkIn, checkOut, nights, onSelectRoom }: HotelCardProps) {
  const availableRooms = hotel.rooms.filter(room => room.availability);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      i < rating ? (
        <StarIconSolid key={i} className="w-4 h-4 text-yellow-400" />
      ) : (
        <StarIcon key={i} className="w-4 h-4 text-neutral-900" />
      )
    ));
  };

  const getAmenityIcon = (amenity: string) => {
    switch (amenity.toLowerCase()) {
      case 'wifi':
        return <WifiIcon className="w-4 h-4" />;
      case 'tv':
        return <TvIcon className="w-4 h-4" />;
      case 'parking':
        return <BuildingStorefrontIcon className="w-4 h-4" />;
      case 'restaurant':
        return <BuildingStorefrontIcon className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (availableRooms.length === 0) {
    return null;
  }

  return (
    <Card className="hover:shadow-lg transition-shadow overflow-hidden">
      <div className="flex">
        {/* Hotel Image */}
        <div className="w-1/3 min-h-[200px] bg-gray-200 relative">
          {hotel.images.length > 0 ? (
            <img 
              src={hotel.images[0]} 
              alt={hotel.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BuildingStorefrontIcon className="w-12 h-12 text-gray-700" />
            </div>
          )}
        </div>

        {/* Hotel Details */}
        <div className="flex-1 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold mb-2">{hotel.name}</h3>
              <div className="flex items-center space-x-2 mb-2">
                <div className="flex">{renderStars(hotel.starRating)}</div>
                <span className="text-sm font-bold text-neutral-900">
                  {hotel.rating}/10 ({Math.floor(Math.random() * 500 + 100)} reviews)
                </span>
              </div>
              <div className="flex items-center text-sm font-bold text-neutral-900 mb-3">
                <MapPinIcon className="w-4 h-4 mr-1" />
                <span>{hotel.location.address}, {hotel.location.city}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-700">from</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(Math.min(...availableRooms.map(r => r.price.total)))}
              </p>
              <p className="text-sm text-gray-700">per night</p>
            </div>
          </div>

          {/* Amenities */}
          <div className="flex items-center space-x-3 mb-4">
            {hotel.amenities.slice(0, 6).map((amenity, index) => (
              <div key={index} className="flex items-center space-x-1 text-sm font-bold text-neutral-900">
                {getAmenityIcon(amenity)}
                <span className="capitalize">{amenity}</span>
              </div>
            ))}
            {hotel.amenities.length > 6 && (
              <span className="text-sm font-bold text-neutral-900">
                +{hotel.amenities.length - 6} more
              </span>
            )}
          </div>

          {/* Available Rooms */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800">Available Rooms</h4>
            {availableRooms.slice(0, 2).map((room) => (
              <div key={room.id} className="border rounded-lg p-3 flex items-center justify-between">
                <div className="flex-1">
                  <h5 className="font-medium">{room.name}</h5>
                  <p className="text-sm font-bold text-neutral-900">{room.description}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm font-bold text-neutral-900">
                    <span>Adults: {room.capacity.adults}</span>
                    <span>Children: {room.capacity.children}</span>
                    {room.amenities.slice(0, 3).map((amenity, index) => (
                      <span key={index} className="capitalize">{amenity}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(room.price.total * nights)}
                  </p>
                  <p className="text-sm font-bold text-neutral-900">
                    {formatCurrency(room.price.perNight)}/night
                  </p>
                  <Button 
                    onClick={() => onSelectRoom(hotel, room)}
                    className="mt-2 bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    Select Room
                  </Button>
                </div>
              </div>
            ))}
            {availableRooms.length > 2 && (
              <Button variant="outline" className="w-full">
                View {availableRooms.length - 2} more rooms
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

interface HotelResultsProps {
  hotels: Hotel[];
  checkIn: Date;
  checkOut: Date;
  loading?: boolean;
  onSelectRoom: (hotel: Hotel, room: HotelRoom) => void;
}

export function HotelResults({ 
  hotels, 
  checkIn, 
  checkOut, 
  loading, 
  onSelectRoom 
}: HotelResultsProps) {
  const nights = Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="flex">
              <div className="w-1/3 h-48 bg-gray-200"></div>
              <div className="flex-1 p-6">
                <div className="h-6 bg-gray-200 rounded mb-2 w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded mb-4 w-1/2"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (hotels.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="font-bold text-neutral-900">No hotels found for your search criteria.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Hotels ({hotels.length})</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-bold text-neutral-900">Sort by:</span>
          <select className="border rounded px-2 py-1 text-sm">
            <option>Price (Low to High)</option>
            <option>Star Rating</option>
            <option>Guest Rating</option>
            <option>Distance</option>
          </select>
        </div>
      </div>
      
      {hotels.map((hotel) => (
        <HotelCard
          key={hotel.id}
          hotel={hotel}
          checkIn={checkIn}
          checkOut={checkOut}
          nights={nights}
          onSelectRoom={onSelectRoom}
        />
      ))}
    </div>
  );
}
