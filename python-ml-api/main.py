from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import uvicorn
import os
from datetime import datetime
import logging
import asyncio

from ml_model import FlightPriceMLModel
from realtime_scraper import RealTimeFlightScraper, FlightData

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TripTactix ML API",
    description="Machine Learning API for flight price predictions",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001", 
        "https://your-domain.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ML model and scraper
ml_model = FlightPriceMLModel()
flight_scraper = RealTimeFlightScraper()

# Load existing model or train new one
if not ml_model.load_model():
    logger.info("No existing model found. Training new model...")
    ml_model.train_model()
    ml_model.save_model()

class FlightPredictionRequest(BaseModel):
    airline: str
    source_city: str
    destination_city: str
    departure_date: str  # YYYY-MM-DD format
    departure_time: Optional[str] = "10:00"  # HH:MM format
    journey_duration_hours: Optional[float] = 2.5
    total_stops: Optional[int] = 0
    travel_class: Optional[str] = "economy"

class PredictionResponse(BaseModel):
    success: bool
    predicted_price: int
    confidence: float
    price_range: Dict[str, int]
    recommendation: str
    factors: Dict[str, Any]
    chart_data: list

class FlightSearchRequest(BaseModel):
    origin: str
    destination: str
    departure_date: str  # YYYY-MM-DD format
    return_date: Optional[str] = None
    passengers: Optional[int] = 1
    travel_class: Optional[str] = "economy"

class FlightSearchResponse(BaseModel):
    success: bool
    flights: List[Dict[str, Any]]
    total_found: int
    search_time: float
    sources: List[str]

class FlightComparisonResponse(BaseModel):
    success: bool
    realtime_flights: List[Dict[str, Any]]
    ml_predictions: List[Dict[str, Any]]
    price_analysis: Dict[str, Any]
    recommendations: List[str]

@app.get("/")
async def root():
    return {
        "message": "TripTactix ML API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": ml_model.model is not None,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict_flight_price(request: FlightPredictionRequest):
    try:
        logger.info(f"Prediction request: {request.dict()}")
        
        # Convert request to model parameters
        flight_params = request.dict()
        
        # Get ML prediction
        prediction_result = ml_model.predict_price(flight_params)
        
        # Generate recommendation based on prediction
        recommendation = generate_recommendation(
            prediction_result['predicted_price'],
            prediction_result['confidence'],
            flight_params
        )
        
        # Generate price history chart data
        chart_data = generate_price_chart(flight_params, prediction_result['predicted_price'])
        
        # Generate factors explanation
        factors = generate_factors_explanation(flight_params, prediction_result)
        
        response = PredictionResponse(
            success=True,
            predicted_price=prediction_result['predicted_price'],
            confidence=prediction_result['confidence'],
            price_range=prediction_result['price_range'],
            recommendation=recommendation,
            factors=factors,
            chart_data=chart_data
        )
        
        logger.info(f"Prediction successful: ₹{prediction_result['predicted_price']}")
        return response
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.post("/batch-predict")
async def batch_predict_prices(requests: list[FlightPredictionRequest]):
    """Predict prices for multiple flights"""
    try:
        results = []
        for request in requests:
            flight_params = request.dict()
            prediction_result = ml_model.predict_price(flight_params)
            
            results.append({
                "request": flight_params,
                "prediction": prediction_result
            })
        
        return {
            "success": True,
            "predictions": results,
            "count": len(results)
        }
        
    except Exception as e:
        logger.error(f"Batch prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")

@app.post("/search-flights", response_model=FlightSearchResponse)
async def search_realtime_flights(request: FlightSearchRequest):
    """Search for real-time flight prices from multiple sources"""
    try:
        start_time = datetime.now()
        logger.info(f"Real-time flight search: {request.origin} -> {request.destination} on {request.departure_date}")
        
        # Search flights from real-time sources
        flights = flight_scraper.search_flights(
            origin=request.origin,
            destination=request.destination,
            departure_date=request.departure_date,
            return_date=request.return_date
        )
        
        search_time = (datetime.now() - start_time).total_seconds()
        
        # Convert to response format
        flight_data = []
        sources = set()
        
        for flight in flights:
            sources.add(flight.source)
            flight_dict = {
                'id': flight.id,
                'airline': flight.airline,
                'flight_number': flight.flight_number,
                'departure_time': flight.departure_time,
                'arrival_time': flight.arrival_time,
                'duration': flight.duration,
                'price': flight.price,
                'currency': flight.currency,
                'stops': flight.stops,
                'source': flight.source,
                'booking_url': flight.booking_url,
                'scraped_at': flight.scraped_at.isoformat()
            }
            flight_data.append(flight_dict)
        
        response = FlightSearchResponse(
            success=True,
            flights=flight_data,
            total_found=len(flights),
            search_time=search_time,
            sources=list(sources)
        )
        
        logger.info(f"Found {len(flights)} flights from {len(sources)} sources in {search_time:.2f}s")
        return response
        
    except Exception as e:
        logger.error(f"Real-time flight search error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Flight search failed: {str(e)}")

@app.post("/compare-flights", response_model=FlightComparisonResponse)
async def compare_flights_with_ml(request: FlightSearchRequest):
    """Search real-time flights and compare with ML predictions"""
    try:
        logger.info(f"Flight comparison with ML: {request.origin} -> {request.destination}")
        
        # Get real-time flight data
        realtime_flights = flight_scraper.search_flights(
            origin=request.origin,
            destination=request.destination,
            departure_date=request.departure_date,
            return_date=request.return_date
        )
        
        # Get historical data for context
        historical_data = flight_scraper.get_historical_prices(
            origin=request.origin,
            destination=request.destination,
            days_back=30
        )
        
        # Apply ML predictions to each flight
        ml_predictions = []
        for flight in realtime_flights:
            try:
                flight_params = {
                    'airline': flight.airline,
                    'source_city': request.origin,
                    'destination_city': request.destination,
                    'departure_date': request.departure_date,
                    'departure_time': flight.departure_time.split()[-1] if ' ' in flight.departure_time else '10:00',
                    'journey_duration_hours': 2.5,  # Default duration
                    'total_stops': flight.stops,
                    'travel_class': request.travel_class
                }
                
                prediction_result = ml_model.predict_price(flight_params)
                
                ml_prediction = {
                    'flight_id': flight.id,
                    'actual_price': flight.price,
                    'predicted_price': prediction_result['predicted_price'],
                    'confidence': prediction_result['confidence'],
                    'price_difference': flight.price - prediction_result['predicted_price'],
                    'percentage_difference': ((flight.price - prediction_result['predicted_price']) / flight.price) * 100,
                    'recommendation': generate_comparison_recommendation(flight.price, prediction_result['predicted_price'], prediction_result['confidence'])
                }
                
                ml_predictions.append(ml_prediction)
                
            except Exception as e:
                logger.warning(f"ML prediction failed for flight {flight.id}: {str(e)}")
                continue
        
        # Analyze price patterns
        if historical_data and realtime_flights:
            avg_historical = sum(h['price'] for h in historical_data[-7:]) / min(7, len(historical_data))
            avg_current = sum(f.price for f in realtime_flights) / len(realtime_flights)
            
            price_analysis = {
                'avg_historical_price': int(avg_historical),
                'avg_current_price': int(avg_current),
                'price_trend': 'increasing' if avg_current > avg_historical * 1.05 else 'decreasing' if avg_current < avg_historical * 0.95 else 'stable',
                'best_deal_flight_id': min(realtime_flights, key=lambda f: f.price).id if realtime_flights else None,
                'price_range': {
                    'min': min(f.price for f in realtime_flights),
                    'max': max(f.price for f in realtime_flights)
                } if realtime_flights else {'min': 0, 'max': 0}
            }
        else:
            price_analysis = {
                'avg_historical_price': 0,
                'avg_current_price': 0,
                'price_trend': 'unknown',
                'best_deal_flight_id': None,
                'price_range': {'min': 0, 'max': 0}
            }
        
        # Generate recommendations
        recommendations = generate_flight_recommendations(realtime_flights, ml_predictions, price_analysis)
        
        # Format response
        realtime_data = [
            {
                'id': f.id,
                'airline': f.airline,
                'flight_number': f.flight_number,
                'price': f.price,
                'departure_time': f.departure_time,
                'duration': f.duration,
                'stops': f.stops,
                'source': f.source,
                'booking_url': f.booking_url
            }
            for f in realtime_flights
        ]
        
        response = FlightComparisonResponse(
            success=True,
            realtime_flights=realtime_data,
            ml_predictions=ml_predictions,
            price_analysis=price_analysis,
            recommendations=recommendations
        )
        
        logger.info(f"Flight comparison completed: {len(realtime_flights)} flights analyzed")
        return response
        
    except Exception as e:
        logger.error(f"Flight comparison error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Flight comparison failed: {str(e)}")

class PriceTrendRequest(BaseModel):
    source_city: str
    destination_city: str
    days_ahead: Optional[int] = 30

class PriceAnalysisRequest(BaseModel):
    current_price: int
    source_city: str
    destination_city: str
    departure_date: str

@app.options("/price-trend")
async def price_trend_options():
    """Handle CORS preflight for price-trend endpoint"""
    return {"message": "OK"}

@app.post("/price-trend")
async def get_price_trend(request: PriceTrendRequest):
    """Get price trend prediction for a route"""
    try:
        logger.info(f"Getting price trend for {request.source_city} -> {request.destination_city}")
        
        trends = ml_model.get_price_trend(
            request.source_city,
            request.destination_city,
            request.days_ahead or 30
        )
        
        return {
            "success": True,
            "route": f"{request.source_city} -> {request.destination_city}",
            "trend_data": trends,
            "summary": {
                "min_price": min(t['predicted_price'] for t in trends) if trends else 0,
                "max_price": max(t['predicted_price'] for t in trends) if trends else 0,
                "avg_price": sum(t['predicted_price'] for t in trends) / len(trends) if trends else 0
            }
        }
    
    except Exception as e:
        logger.error(f"Price trend failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Price trend analysis failed: {str(e)}")

@app.get("/price-trend")
async def get_price_trend_get(source_city: str, destination_city: str, days_ahead: int = 30):
    """GET variant for price trend to aid browser testing; mirrors POST response shape"""
    try:
        logger.info(f"Getting price trend (GET) for {source_city} -> {destination_city}")

        trends = ml_model.get_price_trend(source_city, destination_city, days_ahead or 30)

        return {
            "success": True,
            "route": f"{source_city} -> {destination_city}",
            "trend_data": trends,
            "summary": {
                "min_price": min(t['predicted_price'] for t in trends) if trends else 0,
                "max_price": max(t['predicted_price'] for t in trends) if trends else 0,
                "avg_price": sum(t['predicted_price'] for t in trends) / len(trends) if trends else 0
            }
        }
    except Exception as e:
        logger.error(f"Price trend (GET) failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Price trend analysis failed: {str(e)}")

@app.post("/analyze-price")
async def analyze_current_price(request: PriceAnalysisRequest):
    """Analyze current price vs predicted trends and provide recommendation"""
    try:
        logger.info(f"Analyzing price {request.current_price} for {request.source_city} -> {request.destination_city}")
        
        analysis = ml_model.analyze_price_vs_current(
            request.current_price,
            request.source_city,
            request.destination_city,
            request.departure_date
        )
        
        return {
            "success": True,
            "route": f"{request.source_city} -> {request.destination_city}",
            "analysis": analysis
        }
    
    except Exception as e:
        logger.error(f"Price analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Price analysis failed: {str(e)}")

@app.get("/available-cities")
async def get_available_cities():
    """Get list of cities available in the ML model"""
    try:
        # Load real data to get available cities
        df = ml_model.load_real_data()
        
        source_cities = sorted(df['source_city'].unique().tolist()) if not df.empty else []
        dest_cities = sorted(df['destination_city'].unique().tolist()) if not df.empty else []
        
        # Get combined unique cities
        all_cities = sorted(list(set(source_cities + dest_cities)))
        
        return {
            "success": True,
            "cities": all_cities,
            "total_cities": len(all_cities)
        }
    
    except Exception as e:
        logger.error(f"Get cities failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get available cities: {str(e)}")

@app.get("/historical-prices/{origin}/{destination}")
async def get_historical_prices(origin: str, destination: str, days_back: int = 30):
    """Get historical price data for a route"""
    try:
        historical_data = flight_scraper.get_historical_prices(
            origin=origin,
            destination=destination,
            days_back=days_back
        )
        
        return {
            'success': True,
            'route': f"{origin} -> {destination}",
            'data_points': len(historical_data),
            'historical_data': historical_data,
            'price_summary': {
                'avg_price': int(sum(d['price'] for d in historical_data) / len(historical_data)) if historical_data else 0,
                'min_price': min(d['price'] for d in historical_data) if historical_data else 0,
                'max_price': max(d['price'] for d in historical_data) if historical_data else 0
            }
        }
        
    except Exception as e:
        logger.error(f"Historical prices error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get historical prices: {str(e)}")

def generate_comparison_recommendation(actual_price: int, predicted_price: int, confidence: float) -> str:
    """Generate recommendation based on price comparison"""
    difference = actual_price - predicted_price
    percentage_diff = abs(difference) / actual_price
    
    if confidence < 0.7:
        return "low_confidence"
    elif difference > 0 and percentage_diff > 0.15:
        return "overpriced"  # Actual price is significantly higher than predicted
    elif difference < 0 and percentage_diff > 0.15:
        return "great_deal"  # Actual price is significantly lower than predicted
    else:
        return "fair_price"  # Price is close to prediction

def generate_flight_recommendations(flights: List[FlightData], predictions: List[Dict], analysis: Dict) -> List[str]:
    """Generate overall flight recommendations"""
    recommendations = []
    
    if not flights:
        return ["No flights found. Try different dates or routes."]
    
    # Best deal recommendation
    if analysis.get('best_deal_flight_id'):
        recommendations.append(f"Best deal: Flight {analysis['best_deal_flight_id']} offers the lowest price")
    
    # ML-based recommendations
    great_deals = [p for p in predictions if p.get('recommendation') == 'great_deal']
    if great_deals:
        recommendations.append(f"ML Analysis: {len(great_deals)} flights are priced below predicted value - consider booking")
    
    overpriced = [p for p in predictions if p.get('recommendation') == 'overpriced']
    if overpriced:
        recommendations.append(f"ML Analysis: {len(overpriced)} flights are overpriced - consider waiting or alternative dates")
    
    # Trend analysis
    if analysis.get('price_trend') == 'increasing':
        recommendations.append("Price trend: Prices are increasing. Consider booking soon.")
    elif analysis.get('price_trend') == 'decreasing':
        recommendations.append("Price trend: Prices are decreasing. You might want to wait a bit longer.")
    
    # Direct flights recommendation
    direct_flights = [f for f in flights if f.stops == 0]
    if direct_flights and len(direct_flights) < len(flights):
        cheapest_direct = min(direct_flights, key=lambda f: f.price)
        recommendations.append(f"Direct flight available: {cheapest_direct.airline} for ₹{cheapest_direct.price}")
    
    if not recommendations:
        recommendations.append("All flights are fairly priced. Choose based on timing and airline preference.")
    
    return recommendations

def generate_recommendation(predicted_price: int, confidence: float, params: Dict) -> str:
    """Generate booking recommendation based on prediction"""
    departure_date = datetime.strptime(params['departure_date'], '%Y-%m-%d')
    days_until = (departure_date.date() - datetime.now().date()).days
    
    if days_until < 7:
        return "book_now"  # Last minute booking
    elif predicted_price < 4000 and confidence > 0.8:
        return "book_now"  # Good price with high confidence
    elif days_until > 60:
        return "wait"  # Too early, wait for better prices
    else:
        return "monitor"  # Keep monitoring

def generate_price_chart(params: Dict, predicted_price: int) -> list:
    """Generate price history and forecast chart data"""
    import random
    from datetime import timedelta
    
    chart_data = []
    base_date = datetime.now() - timedelta(days=30)
    
    # Historical data (30 days)
    for i in range(30):
        date = base_date + timedelta(days=i)
        # Simulate price variation around predicted price
        variation = random.uniform(0.8, 1.2)
        price = int(predicted_price * variation)
        
        chart_data.append({
            "date": date.isoformat().split('T')[0],
            "price": price,
            "type": "historical"
        })
    
    # Future predictions (14 days)
    for i in range(14):
        date = datetime.now() + timedelta(days=i+1)
        # Add trend based on days until departure
        days_until = (datetime.strptime(params['departure_date'], '%Y-%m-%d').date() - date.date()).days
        
        if days_until < 7:
            trend_multiplier = 1.1 + (7-days_until) * 0.05  # Price increases as departure approaches
        else:
            trend_multiplier = 1.0
        
        price = int(predicted_price * trend_multiplier * random.uniform(0.95, 1.05))
        
        chart_data.append({
            "date": date.isoformat().split('T')[0],
            "price": price,
            "type": "predicted"
        })
    
    return chart_data

def generate_factors_explanation(params: Dict, prediction_result: Dict) -> Dict[str, Any]:
    """Generate explanation of factors affecting the price"""
    factors = {
        "airline_impact": get_airline_impact(params['airline']),
        "route_popularity": get_route_impact(params['source_city'], params['destination_city']),
        "timing_impact": get_timing_impact(params['departure_date'], params.get('departure_time', '10:00')),
        "booking_window": get_booking_window_impact(params['departure_date']),
        "confidence_level": prediction_result['confidence']
    }
    
    return factors

def get_airline_impact(airline: str) -> str:
    airline_impacts = {
        'IndiGo': "Budget airline with competitive pricing",
        'SpiceJet': "Low-cost carrier offering good value",
        'Air India': "Full-service airline with premium pricing",
        'Vistara': "Premium airline with higher service standards",
        'AirAsia India': "Ultra-low-cost carrier with basic pricing",
        'Akasa Air': "New airline with competitive introductory pricing"
    }
    return airline_impacts.get(airline, "Standard airline pricing")

def get_route_impact(source: str, destination: str) -> str:
    popular_routes = [('Delhi', 'Mumbai'), ('Mumbai', 'Bangalore'), ('Delhi', 'Bangalore')]
    route = (source, destination)
    
    if route in popular_routes or route[::-1] in popular_routes:
        return "Popular route with high competition leading to better prices"
    else:
        return "Less popular route with limited competition"

def get_timing_impact(departure_date: str, departure_time: str) -> str:
    departure_dt = datetime.strptime(f"{departure_date} {departure_time}", '%Y-%m-%d %H:%M')
    hour = departure_dt.hour
    is_weekend = departure_dt.weekday() >= 5
    
    timing_factors = []
    
    if 6 <= hour < 9:
        timing_factors.append("Early morning departure offers lower prices")
    elif 18 <= hour < 21:
        timing_factors.append("Peak evening hours increase demand")
    
    if is_weekend:
        timing_factors.append("Weekend travel increases demand and prices")
    
    if departure_dt.month in [12, 1, 4, 5, 10]:
        timing_factors.append("Holiday season affects pricing")
    
    return "; ".join(timing_factors) if timing_factors else "Standard timing with neutral impact"

def get_booking_window_impact(departure_date: str) -> str:
    departure_dt = datetime.strptime(departure_date, '%Y-%m-%d')
    days_until = (departure_dt.date() - datetime.now().date()).days
    
    if days_until < 7:
        return "Last-minute booking premium applies"
    elif days_until < 30:
        return "Short booking window may result in higher prices"
    elif 30 <= days_until <= 60:
        return "Optimal booking window for best prices"
    else:
        return "Early booking - prices may fluctuate"

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
