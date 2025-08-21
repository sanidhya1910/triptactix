#!/bin/bash

echo "🧪 Testing TripTactix ML Integration"
echo "==================================="

# Test the Next.js API endpoint that now uses ML
echo "📡 Testing Next.js ML-integrated API..."

curl -X POST "http://localhost:3000/api/predictions" \
  -H "Content-Type: application/json" \
  -d '{
    "searchParams": {
      "airline": "IndiGo",
      "from": "Delhi",
      "to": "Mumbai",
      "departureTime": "14:30",
      "class": "economy",
      "stops": 0,
      "departureDate": "2024-12-25"
    }
  }' | jq '.'

echo ""
echo "🤖 Testing Python ML API directly..."

curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "airline": "IndiGo",
    "source_city": "Delhi", 
    "destination_city": "Mumbai",
    "departure_date": "2024-12-25",
    "departure_time": "14:30",
    "journey_duration_hours": 2.5,
    "total_stops": 0,
    "travel_class": "economy"
  }' | jq '.'
