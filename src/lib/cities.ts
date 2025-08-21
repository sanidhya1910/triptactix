export interface City {
  name: string;
  country: string;
  code: string;
  airport: string;
  region?: string;
}

// Comprehensive cities database for autocomplete
export const cities: City[] = [
  // Major Indian Cities - Metros & Tier 1
  { name: 'New Delhi', country: 'India', code: 'DEL', airport: 'Indira Gandhi International Airport', region: 'North India' },
  { name: 'Mumbai', country: 'India', code: 'BOM', airport: 'Chhatrapati Shivaji Maharaj International Airport', region: 'West India' },
  { name: 'Bangalore', country: 'India', code: 'BLR', airport: 'Kempegowda International Airport', region: 'South India' },
  { name: 'Chennai', country: 'India', code: 'MAA', airport: 'Chennai International Airport', region: 'South India' },
  { name: 'Kolkata', country: 'India', code: 'CCU', airport: 'Netaji Subhash Chandra Bose International Airport', region: 'East India' },
  { name: 'Hyderabad', country: 'India', code: 'HYD', airport: 'Rajiv Gandhi International Airport', region: 'South India' },
  { name: 'Pune', country: 'India', code: 'PNQ', airport: 'Pune Airport', region: 'West India' },
  { name: 'Ahmedabad', country: 'India', code: 'AMD', airport: 'Sardar Vallabhbhai Patel International Airport', region: 'West India' },
  
  // Tier 2 Indian Cities
  { name: 'Kochi', country: 'India', code: 'COK', airport: 'Cochin International Airport', region: 'South India' },
  { name: 'Goa', country: 'India', code: 'GOI', airport: 'Goa International Airport', region: 'West India' },
  { name: 'Jaipur', country: 'India', code: 'JAI', airport: 'Jaipur International Airport', region: 'North India' },
  { name: 'Lucknow', country: 'India', code: 'LKO', airport: 'Chaudhary Charan Singh International Airport', region: 'North India' },
  { name: 'Chandigarh', country: 'India', code: 'IXC', airport: 'Chandigarh Airport', region: 'North India' },
  { name: 'Bhubaneswar', country: 'India', code: 'BBI', airport: 'Biju Patnaik International Airport', region: 'East India' },
  { name: 'Thiruvananthapuram', country: 'India', code: 'TRV', airport: 'Thiruvananthapuram International Airport', region: 'South India' },
  { name: 'Indore', country: 'India', code: 'IDR', airport: 'Devi Ahilya Bai Holkar Airport', region: 'Central India' },
  { name: 'Nagpur', country: 'India', code: 'NAG', airport: 'Dr. Babasaheb Ambedkar International Airport', region: 'Central India' },
  { name: 'Varanasi', country: 'India', code: 'VNS', airport: 'Lal Bahadur Shastri International Airport', region: 'North India' },
  { name: 'Amritsar', country: 'India', code: 'ATQ', airport: 'Sri Guru Ram Dass Jee International Airport', region: 'North India' },
  { name: 'Srinagar', country: 'India', code: 'SXR', airport: 'Sheikh ul-Alam International Airport', region: 'North India' },

  // All Other Indian Cities with Airports
  { name: 'Agra', country: 'India', code: 'AGR', airport: 'Pandit Deen Dayal Upadhyay Airport', region: 'North India' },
  { name: 'Agartala', country: 'India', code: 'IXA', airport: 'Maharaja Bir Bikram Airport', region: 'Northeast India' },
  { name: 'Aizawl', country: 'India', code: 'AJL', airport: 'Lengpui Airport', region: 'Northeast India' },
  { name: 'Akola', country: 'India', code: 'AKD', airport: 'Akola Airport', region: 'Central India' },
  { name: 'Allahabad', country: 'India', code: 'IXD', airport: 'Prayagraj Airport', region: 'North India' },
  { name: 'Aurangabad', country: 'India', code: 'IXU', airport: 'Aurangabad Airport', region: 'West India' },
  { name: 'Bagdogra', country: 'India', code: 'IXB', airport: 'Bagdogra Airport', region: 'East India' },
  { name: 'Bareilly', country: 'India', code: 'BEK', airport: 'Bareilly Airport', region: 'North India' },
  { name: 'Belgaum', country: 'India', code: 'IXG', airport: 'Belgaum Airport', region: 'South India' },
  { name: 'Bellary', country: 'India', code: 'BEP', airport: 'Bellary Airport', region: 'South India' },
  { name: 'Bhavnagar', country: 'India', code: 'BHU', airport: 'Bhavnagar Airport', region: 'West India' },
  { name: 'Bhilai', country: 'India', code: 'RPR', airport: 'Swami Vivekananda Airport', region: 'Central India' },
  { name: 'Bhopal', country: 'India', code: 'BHO', airport: 'Raja Bhoj Airport', region: 'Central India' },
  { name: 'Bikaner', country: 'India', code: 'BKB', airport: 'Nal Airport', region: 'North India' },
  { name: 'Bilaspur', country: 'India', code: 'PAB', airport: 'Bilaspur Airport', region: 'Central India' },
  { name: 'Coimbatore', country: 'India', code: 'CJB', airport: 'Coimbatore International Airport', region: 'South India' },
  { name: 'Cuttack', country: 'India', code: 'CTC', airport: 'Cuttack Airport', region: 'East India' },
  { name: 'Darbhanga', country: 'India', code: 'DBR', airport: 'Darbhanga Airport', region: 'East India' },
  { name: 'Dehradun', country: 'India', code: 'DED', airport: 'Jolly Grant Airport', region: 'North India' },
  { name: 'Dharamshala', country: 'India', code: 'DHM', airport: 'Kangra Airport', region: 'North India' },
  { name: 'Dibrugarh', country: 'India', code: 'DIB', airport: 'Dibrugarh Airport', region: 'Northeast India' },
  { name: 'Dimapur', country: 'India', code: 'DMU', airport: 'Dimapur Airport', region: 'Northeast India' },
  { name: 'Durgapur', country: 'India', code: 'RDP', airport: 'Kazi Nazrul Islam Airport', region: 'East India' },
  { name: 'Gaya', country: 'India', code: 'GAY', airport: 'Gaya Airport', region: 'East India' },
  { name: 'Gorakhpur', country: 'India', code: 'GOP', airport: 'Gorakhpur Airport', region: 'North India' },
  { name: 'Gulbarga', country: 'India', code: 'GUL', airport: 'Gulbarga Airport', region: 'South India' },
  { name: 'Guntur', country: 'India', code: 'GNT', airport: 'Guntur Airport', region: 'South India' },
  { name: 'Guwahati', country: 'India', code: 'GAU', airport: 'Lokpriya Gopinath Bordoloi International Airport', region: 'Northeast India' },
  { name: 'Gwalior', country: 'India', code: 'GWL', airport: 'Gwalior Airport', region: 'Central India' },
  { name: 'Hassan', country: 'India', code: 'HSN', airport: 'Hassan Airport', region: 'South India' },
  { name: 'Hisar', country: 'India', code: 'HSS', airport: 'Hisar Airport', region: 'North India' },
  { name: 'Hubli', country: 'India', code: 'HBX', airport: 'Hubli Airport', region: 'South India' },
  { name: 'Imphal', country: 'India', code: 'IMF', airport: 'Imphal Airport', region: 'Northeast India' },
  { name: 'Jabalpur', country: 'India', code: 'JLR', airport: 'Jabalpur Airport', region: 'Central India' },
  { name: 'Jagdalpur', country: 'India', code: 'JGB', airport: 'Jagdalpur Airport', region: 'Central India' },
  { name: 'Jaisalmer', country: 'India', code: 'JSA', airport: 'Jaisalmer Airport', region: 'North India' },
  { name: 'Jammu', country: 'India', code: 'IXJ', airport: 'Jammu Airport', region: 'North India' },
  { name: 'Jamnagar', country: 'India', code: 'JGA', airport: 'Jamnagar Airport', region: 'West India' },
  { name: 'Jamshedpur', country: 'India', code: 'IXW', airport: 'Sonari Airport', region: 'East India' },
  { name: 'Jharsuguda', country: 'India', code: 'JRG', airport: 'Veer Surendra Sai Airport', region: 'East India' },
  { name: 'Jodhpur', country: 'India', code: 'JDH', airport: 'Jodhpur Airport', region: 'North India' },
  { name: 'Jorhat', country: 'India', code: 'JRH', airport: 'Jorhat Airport', region: 'Northeast India' },
  { name: 'Kadapa', country: 'India', code: 'CDP', airport: 'Kadapa Airport', region: 'South India' },
  { name: 'Kannur', country: 'India', code: 'CNN', airport: 'Kannur International Airport', region: 'South India' },
  { name: 'Kanpur', country: 'India', code: 'KNU', airport: 'Kanpur Airport', region: 'North India' },
  { name: 'Khajuraho', country: 'India', code: 'HJR', airport: 'Khajuraho Airport', region: 'Central India' },
  { name: 'Kishangarh', country: 'India', code: 'KQH', airport: 'Kishangarh Airport', region: 'North India' },
  { name: 'Kolhapur', country: 'India', code: 'KLH', airport: 'Kolhapur Airport', region: 'West India' },
  { name: 'Kozhikode', country: 'India', code: 'CCJ', airport: 'Kozhikode International Airport', region: 'South India' },
  { name: 'Kullu', country: 'India', code: 'KUU', airport: 'Kullu Manali Airport', region: 'North India' },
  { name: 'Kurnool', country: 'India', code: 'KJB', airport: 'Kurnool Airport', region: 'South India' },
  { name: 'Latur', country: 'India', code: 'LTU', airport: 'Latur Airport', region: 'West India' },
  { name: 'Leh', country: 'India', code: 'IXL', airport: 'Kushok Bakula Rimpochee Airport', region: 'North India' },
  { name: 'Lilabari', country: 'India', code: 'IXI', airport: 'Lilabari Airport', region: 'Northeast India' },
  { name: 'Madurai', country: 'India', code: 'IXM', airport: 'Madurai Airport', region: 'South India' },
  { name: 'Mangalore', country: 'India', code: 'IXE', airport: 'Mangalore International Airport', region: 'South India' },
  { name: 'Mohanbari', country: 'India', code: 'MOH', airport: 'Mohanbari Airport', region: 'Northeast India' },
  { name: 'Mysore', country: 'India', code: 'MYQ', airport: 'Mysore Airport', region: 'South India' },
  { name: 'Nashik', country: 'India', code: 'ISK', airport: 'Nashik Airport', region: 'West India' },
  { name: 'Nanded', country: 'India', code: 'NDC', airport: 'Nanded Airport', region: 'West India' },
  { name: 'Neyveli', country: 'India', code: 'NVY', airport: 'Neyveli Airport', region: 'South India' },
  { name: 'North Lakhimpur', country: 'India', code: 'IXI', airport: 'Lilabari Airport', region: 'Northeast India' },
  { name: 'Ozar', country: 'India', code: 'OZA', airport: 'Ozar Airport', region: 'West India' },
  { name: 'Pantnagar', country: 'India', code: 'PGH', airport: 'Pantnagar Airport', region: 'North India' },
  { name: 'Pasighat', country: 'India', code: 'IXT', airport: 'Pasighat Airport', region: 'Northeast India' },
  { name: 'Pathankot', country: 'India', code: 'IXP', airport: 'Pathankot Airport', region: 'North India' },
  { name: 'Patna', country: 'India', code: 'PAT', airport: 'Jay Prakash Narayan International Airport', region: 'East India' },
  { name: 'Pondicherry', country: 'India', code: 'PNY', airport: 'Pondicherry Airport', region: 'South India' },
  { name: 'Porbandar', country: 'India', code: 'PBD', airport: 'Porbandar Airport', region: 'West India' },
  { name: 'Port Blair', country: 'India', code: 'IXZ', airport: 'Veer Savarkar International Airport', region: 'South India' },
  { name: 'Puducherry', country: 'India', code: 'PNY', airport: 'Puducherry Airport', region: 'South India' },
  { name: 'Pune', country: 'India', code: 'PNQ', airport: 'Pune Airport', region: 'West India' },
  { name: 'Puttaparthi', country: 'India', code: 'PUT', airport: 'Sri Sathya Sai Airport', region: 'South India' },
  { name: 'Raipur', country: 'India', code: 'RPR', airport: 'Swami Vivekananda Airport', region: 'Central India' },
  { name: 'Rajahmundry', country: 'India', code: 'RJA', airport: 'Rajahmundry Airport', region: 'South India' },
  { name: 'Rajkot', country: 'India', code: 'RAJ', airport: 'Rajkot Airport', region: 'West India' },
  { name: 'Ranchi', country: 'India', code: 'IXR', airport: 'Birsa Munda Airport', region: 'East India' },
  { name: 'Rourkela', country: 'India', code: 'RRK', airport: 'Rourkela Airport', region: 'East India' },
  { name: 'Salem', country: 'India', code: 'SXV', airport: 'Salem Airport', region: 'South India' },
  { name: 'Shillong', country: 'India', code: 'SHL', airport: 'Shillong Airport', region: 'Northeast India' },
  { name: 'Shimla', country: 'India', code: 'SLV', airport: 'Shimla Airport', region: 'North India' },
  { name: 'Silchar', country: 'India', code: 'IXS', airport: 'Silchar Airport', region: 'Northeast India' },
  { name: 'Solapur', country: 'India', code: 'SSE', airport: 'Solapur Airport', region: 'West India' },
  { name: 'Surat', country: 'India', code: 'STV', airport: 'Surat Airport', region: 'West India' },
  { name: 'Tezpur', country: 'India', code: 'TEZ', airport: 'Tezpur Airport', region: 'Northeast India' },
  { name: 'Thanjavur', country: 'India', code: 'TJV', airport: 'Thanjavur Air Force Station', region: 'South India' },
  { name: 'Tiruchirappalli', country: 'India', code: 'TRZ', airport: 'Tiruchirappalli International Airport', region: 'South India' },
  { name: 'Tirupati', country: 'India', code: 'TIR', airport: 'Tirupati Airport', region: 'South India' },
  { name: 'Tuticorin', country: 'India', code: 'TCR', airport: 'Tuticorin Airport', region: 'South India' },
  { name: 'Udaipur', country: 'India', code: 'UDR', airport: 'Maharana Pratap Airport', region: 'North India' },
  { name: 'Vadodara', country: 'India', code: 'BDQ', airport: 'Vadodara Airport', region: 'West India' },
  { name: 'Vijayawada', country: 'India', code: 'VGA', airport: 'Vijayawada Airport', region: 'South India' },
  { name: 'Visakhapatnam', country: 'India', code: 'VTZ', airport: 'Visakhapatnam Airport', region: 'South India' },
  { name: 'Warangal', country: 'India', code: 'WGC', airport: 'Warangal Airport', region: 'South India' },
  { name: 'Zero', country: 'India', code: 'ZER', airport: 'Zero Airport', region: 'Northeast India' },

  // International - Asia
  { name: 'Dubai', country: 'United Arab Emirates', code: 'DXB', airport: 'Dubai International Airport', region: 'Middle East' },
  { name: 'Singapore', country: 'Singapore', code: 'SIN', airport: 'Singapore Changi Airport', region: 'Southeast Asia' },
  { name: 'Bangkok', country: 'Thailand', code: 'BKK', airport: 'Suvarnabhumi Airport', region: 'Southeast Asia' },
  { name: 'Tokyo', country: 'Japan', code: 'NRT', airport: 'Narita International Airport', region: 'East Asia' },
  { name: 'Hong Kong', country: 'Hong Kong', code: 'HKG', airport: 'Hong Kong International Airport', region: 'East Asia' },
  { name: 'Kuala Lumpur', country: 'Malaysia', code: 'KUL', airport: 'Kuala Lumpur International Airport', region: 'Southeast Asia' },
  { name: 'Seoul', country: 'South Korea', code: 'ICN', airport: 'Incheon International Airport', region: 'East Asia' },
  { name: 'Doha', country: 'Qatar', code: 'DOH', airport: 'Hamad International Airport', region: 'Middle East' },
  { name: 'Abu Dhabi', country: 'United Arab Emirates', code: 'AUH', airport: 'Abu Dhabi International Airport', region: 'Middle East' },
  { name: 'Istanbul', country: 'Turkey', code: 'IST', airport: 'Istanbul Airport', region: 'Europe/Asia' },

  // International - Europe
  { name: 'London', country: 'United Kingdom', code: 'LHR', airport: 'Heathrow Airport', region: 'Western Europe' },
  { name: 'Paris', country: 'France', code: 'CDG', airport: 'Charles de Gaulle Airport', region: 'Western Europe' },
  { name: 'Amsterdam', country: 'Netherlands', code: 'AMS', airport: 'Amsterdam Airport Schiphol', region: 'Western Europe' },
  { name: 'Frankfurt', country: 'Germany', code: 'FRA', airport: 'Frankfurt Airport', region: 'Western Europe' },
  { name: 'Zurich', country: 'Switzerland', code: 'ZUR', airport: 'Zurich Airport', region: 'Western Europe' },
  { name: 'Rome', country: 'Italy', code: 'FCO', airport: 'Leonardo da Vinci International Airport', region: 'Southern Europe' },
  { name: 'Madrid', country: 'Spain', code: 'MAD', airport: 'Madrid-Barajas Airport', region: 'Southern Europe' },
  { name: 'Vienna', country: 'Austria', code: 'VIE', airport: 'Vienna International Airport', region: 'Central Europe' },

  // International - Americas
  { name: 'New York', country: 'United States', code: 'JFK', airport: 'John F. Kennedy International Airport', region: 'North America' },
  { name: 'Los Angeles', country: 'United States', code: 'LAX', airport: 'Los Angeles International Airport', region: 'North America' },
  { name: 'San Francisco', country: 'United States', code: 'SFO', airport: 'San Francisco International Airport', region: 'North America' },
  { name: 'Chicago', country: 'United States', code: 'ORD', airport: "O'Hare International Airport", region: 'North America' },
  { name: 'Toronto', country: 'Canada', code: 'YYZ', airport: 'Toronto Pearson International Airport', region: 'North America' },
  { name: 'Vancouver', country: 'Canada', code: 'YVR', airport: 'Vancouver International Airport', region: 'North America' },

  // International - Oceania
  { name: 'Sydney', country: 'Australia', code: 'SYD', airport: 'Sydney Kingsford Smith Airport', region: 'Oceania' },
  { name: 'Melbourne', country: 'Australia', code: 'MEL', airport: 'Melbourne Airport', region: 'Oceania' },
  { name: 'Perth', country: 'Australia', code: 'PER', airport: 'Perth Airport', region: 'Oceania' },
  { name: 'Auckland', country: 'New Zealand', code: 'AKL', airport: 'Auckland Airport', region: 'Oceania' },

  // International - Africa
  { name: 'Cairo', country: 'Egypt', code: 'CAI', airport: 'Cairo International Airport', region: 'Africa' },
  { name: 'Johannesburg', country: 'South Africa', code: 'JNB', airport: 'O.R. Tambo International Airport', region: 'Africa' },
  { name: 'Nairobi', country: 'Kenya', code: 'NBO', airport: 'Jomo Kenyatta International Airport', region: 'Africa' },
  { name: 'Lagos', country: 'Nigeria', code: 'LOS', airport: 'Murtala Muhammed International Airport', region: 'Africa' },
];

// Helper function to search cities
export const searchCities = (query: string, limit: number = 10): City[] => {
  if (!query.trim()) return [];
  
  const searchTerm = query.toLowerCase();
  
  return cities
    .filter(city =>
      city.name.toLowerCase().includes(searchTerm) ||
      city.country.toLowerCase().includes(searchTerm) ||
      city.code.toLowerCase().includes(searchTerm) ||
      city.airport.toLowerCase().includes(searchTerm) ||
      (city.region && city.region.toLowerCase().includes(searchTerm))
    )
    .slice(0, limit);
};

// Helper function to get popular cities
export const getPopularCities = (region?: string): City[] => {
  const popular = [
    'DEL', 'BOM', 'BLR', 'MAA', 'DXB', 'SIN', 'LHR', 'JFK', 'SYD', 'HKG'
  ];
  
  let filteredCities = cities.filter(city => popular.includes(city.code));
  
  if (region) {
    filteredCities = filteredCities.filter(city => city.region === region);
  }
  
  return filteredCities;
};
