from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uvicorn
import os
from datetime import datetime
import logging

from ml_model import FlightPriceMLModel

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
    allow_origins=["http://localhost:3000", "https://your-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ML model
ml_model = FlightPriceMLModel()

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
