---
title: Triptactix ML API
emoji: 📈
colorFrom: green
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
---

# TripTactix ML API

Real machine learning-powered flight price prediction API using Python, FastAPI, and scikit-learn.

## 🚀 Features

- **Real ML Model**: Gradient-boosted trees (`HistGradientBoostingRegressor`) trained on **600K+ real Indian flight records**
- **Two complementary datasets**: `Indian Airlines.csv` (booking-window / `days_left`) + `goibibo_flights_data.csv` (real dates, times & seasonality), combined via native missing-value handling
- **Class-aware**: Economy vs Business are modelled separately (a major accuracy fix)
- **Honest confidence**: 10th/90th-percentile quantile models give real prediction intervals
- **Smart Recommendations**: Book now / wait, judged against the prediction for *your* departure date
- **Fast API**: RESTful API with automatic interactive documentation and a `/metrics` endpoint

## 🛠️ Setup

### Option 1: Local Development

```bash
# Navigate to the ML API directory
cd python-ml-api

# Make setup script executable and run it
chmod +x setup.sh
./setup.sh

# Manual setup alternative:
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python ml_model.py  # Train initial model

# Start the API server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Option 2: Docker

```bash
# Build the Docker image
docker build -t triptactix-ml-api .

# Run the container
docker run -p 8000:8000 triptactix-ml-api
```

### Option 3: Production Deployment

Deploy to cloud platforms like:
- **Railway**: `railway up`
- **Render**: Connect GitHub repo
- **DigitalOcean App Platform**: Deploy from GitHub
- **AWS ECS/Lambda**: Use serverless deployment

## 📊 ML Model Details

### Training Data
- **~600,000 real flight records** combined from two datasets in `../data/`:
  - `Indian Airlines.csv` — provides the **booking window** (`days_left`) signal
  - `goibibo_flights_data.csv` — provides **real flight dates/times** (true month, weekday & departure-hour seasonality)
- Each dataset is missing the column the other provides; the gradient-boosting model learns the booking-window effect from one and the calendar-seasonality effect from the other, while sharing airline/route/class/stops/duration signal. Falls back to synthetic data only if the CSVs are absent.

### Model Architecture
- **Algorithm**: `HistGradientBoostingRegressor` (median) + two quantile models (P10/P90) for prediction intervals
- **Why not a time-series model (e.g. Chronos)?** This is tabular regression, not univariate forecasting — gradient-boosted trees are more accurate here, train in seconds, serialise to ~8 MB (vs ~70 MB for the old Random Forest), and natively handle the per-dataset missing columns.
- **Features (12)**: airline, source, destination, class, stops, duration, departure hour, days-until-departure, month, weekday, weekend flag, route popularity
- **Performance**: **R² ≈ 0.977**, MAE ≈ ₹2,100 on held-out data across both Economy and Business (see `models/metrics.json`)

### Key Features:
1. **Airline Encoding**: Different price tiers for Indian airlines
2. **Route Popularity**: Major routes vs regional routes
3. **Time Factors**: Peak hours, weekends, holiday seasons
4. **Booking Window**: Last-minute vs advance booking patterns
5. **Journey Duration**: Flight time impact on pricing
6. **Stops**: Direct vs connecting flight pricing

## 🔌 API Endpoints

### Health Check
```bash
GET http://localhost:8000/health
```

### Single Prediction
```bash
POST http://localhost:8000/predict
Content-Type: application/json

{
  "airline": "IndiGo",
  "source_city": "Delhi",
  "destination_city": "Mumbai",
  "departure_date": "2024-12-25",
  "departure_time": "14:30",
  "journey_duration_hours": 2.5,
  "total_stops": 0,
  "travel_class": "economy"
}
```

### Batch Predictions
```bash
POST http://localhost:8000/batch-predict
Content-Type: application/json

[
  {
    "airline": "IndiGo",
    "source_city": "Delhi", 
    "destination_city": "Mumbai",
    ...
  },
  {
    "airline": "SpiceJet",
    "source_city": "Bangalore",
    "destination_city": "Chennai", 
    ...
  }
]
```

### Interactive Documentation
Visit `http://localhost:8000/docs` for Swagger UI with interactive API testing.

## 🔗 Integration with Next.js

The Next.js API at `/api/predictions` automatically:
1. **Primary**: Calls Python ML API for real predictions
2. **Fallback**: Uses rule-based simulation if ML API is unavailable
3. **Error Handling**: Graceful degradation with retry logic
4. **Caching**: Results cached for performance

```typescript
// Next.js calls Python ML API
const response = await fetch('http://localhost:8000/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(flightParams)
});
```

## 📈 Response Format

```json
{
  "success": true,
  "predicted_price": 4250,
  "confidence": 0.87,
  "price_range": {
    "min": 3612,
    "max": 4887
  },
  "recommendation": "monitor",
  "factors": {
    "airline_impact": "Budget airline with competitive pricing",
    "route_popularity": "Popular route with high competition",
    "timing_impact": "Peak evening hours increase demand",
    "booking_window": "Optimal booking window for best prices"
  },
  "chart_data": [
    {
      "date": "2024-11-15",
      "price": 3850,
      "type": "historical"
    },
    ...
  ]
}
```

## 🚀 Scaling & Production

### Performance Optimization
- **Model Caching**: Trained model loaded once in memory
- **Batch Processing**: Handle multiple predictions efficiently  
- **Async Operations**: Non-blocking I/O for better throughput

### Monitoring
- **Health Checks**: `/health` endpoint for uptime monitoring
- **Logging**: Structured logging for debugging and analytics
- **Metrics**: Request/response times and prediction accuracy

### Security
- **CORS Configuration**: Proper origin restrictions
- **Rate Limiting**: Prevent API abuse (add Redis-based limiting)
- **Authentication**: Add API keys for production use

## 🔄 Model Updates

### Retraining Process
```bash
# Update training data in ml_model.py
# Retrain model
python ml_model.py

# Restart API server to load new model
uvicorn main:app --reload
```

### A/B Testing
- Deploy multiple model versions
- Route traffic based on experiment configuration
- Compare prediction accuracy and business metrics

## 🎯 Future Enhancements

1. **Real Data Integration**: Replace synthetic data with actual flight pricing APIs
2. **Advanced Models**: XGBoost, Neural Networks, Time Series models
3. **Feature Store**: External data like weather, events, fuel prices
4. **Real-time Updates**: Streaming price updates and model retraining
5. **Multi-model Ensemble**: Combine multiple algorithms for better accuracy

## 🐛 Troubleshooting

### Common Issues

**Port Already in Use**:
```bash
lsof -i :8000
kill -9 <PID>
```

**Dependencies Issues**:
```bash
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

**Model Loading Errors**:
```bash
# Remove existing models and retrain
rm -rf models/
python ml_model.py
```

---

🎉 **Your flight price predictions are now powered by real machine learning!** The system provides intelligent price forecasting with confidence intervals, trend analysis, and smart booking recommendations.
