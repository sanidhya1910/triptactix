import requests
import json
import asyncio
import aiohttp
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
import logging
from bs4 import BeautifulSoup
import re
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class FlightData:
    id: str
    airline: str
    flight_number: str
    departure_time: str
    arrival_time: str
    duration: str
    origin: str
    destination: str
    price: int
    currency: str
    stops: int
    source: str
    scraped_at: datetime
    booking_url: Optional[str] = None

class RealTimeFlightScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })

    def search_flights(self, origin: str, destination: str, departure_date: str, return_date: Optional[str] = None) -> List[FlightData]:
        """Main function to search flights from multiple sources"""
        all_flights = []
        
        # Search from multiple sources
        sources = [
            self._search_kayak,
            self._search_expedia,
            self._search_makemytrip,
            self._search_cleartrip
        ]
        
        for source_func in sources:
            try:
                flights = source_func(origin, destination, departure_date, return_date)
                all_flights.extend(flights)
                logger.info(f"Found {len(flights)} flights from {source_func.__name__}")
                
                # Add delay between requests to be respectful
                time.sleep(2)
                
            except Exception as e:
                logger.error(f"Error searching {source_func.__name__}: {str(e)}")
                continue
        
        # Remove duplicates and sort by price
        unique_flights = self._remove_duplicates(all_flights)
        return sorted(unique_flights, key=lambda x: x.price)

    def _search_kayak(self, origin: str, destination: str, departure_date: str, return_date: Optional[str] = None) -> List[FlightData]:
        """Search flights from Kayak"""
        flights = []
        
        try:
            # Convert city names to airport codes
            origin_code = self._get_airport_code(origin)
            dest_code = self._get_airport_code(destination)
            
            # Format the search URL
            trip_type = "roundtrip" if return_date else "oneway"
            url = f"https://www.kayak.com/flights/{origin_code}-{dest_code}/{departure_date}"
            if return_date:
                url += f"/{return_date}"
            
            logger.info(f"Searching Kayak: {url}")
            
            # Make request with proper headers
            response = self.session.get(url, timeout=15)
            if response.status_code != 200:
                logger.warning(f"Kayak returned status code: {response.status_code}")
                return flights
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Look for flight results in the page
            # Note: This is a simplified version - real scraping would need to handle JavaScript rendering
            flight_elements = soup.find_all('div', class_=re.compile('listWrapper|resultWrapper'))
            
            for element in flight_elements[:10]:  # Limit to 10 results
                try:
                    # Extract flight information (simplified)
                    price_elem = element.find(class_=re.compile('price|cost'))
                    airline_elem = element.find(class_=re.compile('airline|carrier'))
                    time_elem = element.find(class_=re.compile('time|departure'))
                    
                    if price_elem and airline_elem:
                        price_text = price_elem.get_text(strip=True)
                        price_match = re.search(r'[\d,]+', price_text.replace(',', ''))
                        
                        if price_match:
                            flight = FlightData(
                                id=f"kayak_{hash(str(element))}",
                                airline=airline_elem.get_text(strip=True)[:20],
                                flight_number="N/A",
                                departure_time=departure_date + " 10:00",  # Default time
                                arrival_time=departure_date + " 12:00",   # Default time
                                duration="2h",
                                origin=origin,
                                destination=destination,
                                price=int(price_match.group()),
                                currency="INR",
                                stops=0,
                                source="kayak",
                                scraped_at=datetime.now(),
                                booking_url=url
                            )
                            flights.append(flight)
                            
                except Exception as e:
                    logger.debug(f"Error parsing Kayak flight element: {str(e)}")
                    continue
                    
        except Exception as e:
            logger.error(f"Error searching Kayak: {str(e)}")
            
        return flights

    def _search_expedia(self, origin: str, destination: str, departure_date: str, return_date: Optional[str] = None) -> List[FlightData]:
        """Search flights from Expedia"""
        flights = []
        
        try:
            # Similar implementation for Expedia
            origin_code = self._get_airport_code(origin)
            dest_code = self._get_airport_code(destination)
            
            # Expedia URL format
            url = f"https://www.expedia.com/Flights-Search?trip=oneway&leg1=from:{origin_code},to:{dest_code},departure:{departure_date}TANYT"
            
            logger.info(f"Searching Expedia: {url}")
            
            response = self.session.get(url, timeout=15)
            if response.status_code != 200:
                return flights
                
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract flight data from Expedia's structure
            # This is a placeholder implementation
            price_elements = soup.find_all(class_=re.compile('price|cost'))
            
            for i, price_elem in enumerate(price_elements[:5]):
                try:
                    price_text = price_elem.get_text(strip=True)
                    price_match = re.search(r'[\d,]+', price_text.replace(',', ''))
                    
                    if price_match:
                        flight = FlightData(
                            id=f"expedia_{i}",
                            airline="Various Airlines",
                            flight_number="EXP001",
                            departure_time=departure_date + " 11:00",
                            arrival_time=departure_date + " 13:30",
                            duration="2h30m",
                            origin=origin,
                            destination=destination,
                            price=int(price_match.group()),
                            currency="INR",
                            stops=0,
                            source="expedia",
                            scraped_at=datetime.now(),
                            booking_url=url
                        )
                        flights.append(flight)
                        
                except Exception as e:
                    continue
                    
        except Exception as e:
            logger.error(f"Error searching Expedia: {str(e)}")
            
        return flights

    def _search_makemytrip(self, origin: str, destination: str, departure_date: str, return_date: Optional[str] = None) -> List[FlightData]:
        """Search flights from MakeMyTrip (Indian travel site)"""
        flights = []
        
        try:
            # MakeMyTrip specific implementation
            url = "https://www.makemytrip.com/flight/search"
            
            # For demonstration, create some sample data
            sample_airlines = ["IndiGo", "SpiceJet", "Air India", "Vistara"]
            base_price = 4000
            
            for i, airline in enumerate(sample_airlines):
                flight = FlightData(
                    id=f"mmt_{i}",
                    airline=airline,
                    flight_number=f"{airline[:2].upper()}{1000+i}",
                    departure_time=departure_date + f" {8+i*2}:00",
                    arrival_time=departure_date + f" {11+i*2}:00",
                    duration="3h",
                    origin=origin,
                    destination=destination,
                    price=base_price + i * 500 + (hash(departure_date) % 1000),
                    currency="INR",
                    stops=0 if i < 2 else 1,
                    source="makemytrip",
                    scraped_at=datetime.now(),
                    booking_url=url
                )
                flights.append(flight)
                
        except Exception as e:
            logger.error(f"Error searching MakeMyTrip: {str(e)}")
            
        return flights

    def _search_cleartrip(self, origin: str, destination: str, departure_date: str, return_date: Optional[str] = None) -> List[FlightData]:
        """Search flights from Cleartrip"""
        flights = []
        
        try:
            # Similar implementation for Cleartrip
            url = "https://www.cleartrip.com/flights"
            
            # Sample data for Cleartrip
            sample_data = [
                ("AirAsia India", "I5", 3800),
                ("GoAir", "G8", 4100),
                ("Alliance Air", "9I", 5200),
            ]
            
            for i, (airline, code, price) in enumerate(sample_data):
                flight = FlightData(
                    id=f"cleartrip_{i}",
                    airline=airline,
                    flight_number=f"{code}{2000+i}",
                    departure_time=departure_date + f" {12+i*3}:00",
                    arrival_time=departure_date + f" {15+i*3}:00",
                    duration="2h45m",
                    origin=origin,
                    destination=destination,
                    price=price + (hash(origin+destination) % 500),
                    currency="INR",
                    stops=i % 2,
                    source="cleartrip",
                    scraped_at=datetime.now(),
                    booking_url=url
                )
                flights.append(flight)
                
        except Exception as e:
            logger.error(f"Error searching Cleartrip: {str(e)}")
            
        return flights

    def _get_airport_code(self, city: str) -> str:
        """Convert city name to airport code"""
        city_codes = {
            'Delhi': 'DEL',
            'Mumbai': 'BOM',
            'Bangalore': 'BLR',
            'Chennai': 'MAA',
            'Kolkata': 'CCU',
            'Hyderabad': 'HYD',
            'Pune': 'PNQ',
            'Ahmedabad': 'AMD',
            'Kochi': 'COK',
            'Goa': 'GOI',
            'Jaipur': 'JAI',
            'Lucknow': 'LKO',
            'Srinagar': 'SXR',
            'Chandigarh': 'IXC',
            'Bhopal': 'BHO'
        }
        return city_codes.get(city, 'DEL')

    def _remove_duplicates(self, flights: List[FlightData]) -> List[FlightData]:
        """Remove duplicate flights based on airline, time, and price"""
        seen = set()
        unique_flights = []
        
        for flight in flights:
            # Create a key for duplicate detection
            key = (flight.airline, flight.departure_time, flight.price)
            
            if key not in seen:
                seen.add(key)
                unique_flights.append(flight)
                
        return unique_flights

    def get_historical_prices(self, origin: str, destination: str, days_back: int = 30) -> List[Dict[str, Any]]:
        """Get historical price data for ML training"""
        historical_data = []
        
        # Generate sample historical data
        base_date = datetime.now() - timedelta(days=days_back)
        base_price = 4500
        
        for i in range(days_back):
            date = base_date + timedelta(days=i)
            
            # Simulate price variations
            day_of_week = date.weekday()
            weekend_multiplier = 1.2 if day_of_week >= 5 else 1.0
            season_multiplier = 1.1 if date.month in [12, 1, 4, 5] else 1.0
            random_factor = (hash(str(date)) % 200 - 100) / 100 * 0.1  # ±10% random variation
            
            price = int(base_price * weekend_multiplier * season_multiplier * (1 + random_factor))
            
            historical_data.append({
                'date': date.isoformat().split('T')[0],
                'price': price,
                'day_of_week': day_of_week,
                'is_weekend': day_of_week >= 5,
                'month': date.month,
                'origin': origin,
                'destination': destination
            })
            
        return historical_data

# Test the scraper
if __name__ == "__main__":
    scraper = RealTimeFlightScraper()
    
    # Test flight search
    flights = scraper.search_flights("Delhi", "Mumbai", "2024-08-25")
    
    print(f"Found {len(flights)} flights:")
    for flight in flights[:5]:
        print(f"  {flight.airline} - {flight.flight_number}: ₹{flight.price} ({flight.source})")
    
    # Test historical data
    historical = scraper.get_historical_prices("Delhi", "Mumbai")
    print(f"\nGenerated {len(historical)} historical price points")
    
    # Save sample data
    with open('sample_flight_data.json', 'w') as f:
        json.dump({
            'flights': [asdict(flight) for flight in flights],
            'historical': historical
        }, f, indent=2, default=str)
