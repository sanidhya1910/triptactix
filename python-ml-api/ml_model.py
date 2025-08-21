import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import os
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

class FlightPriceMLModel:
    def __init__(self):
        self.model = None
        self.label_encoders = {}
        self.scaler = StandardScaler()
        self.feature_columns = [
            'airline_encoded', 'source_city_encoded', 'destination_city_encoded',
            'departure_hour', 'departure_day', 'departure_month', 'departure_weekday',
            'journey_duration_hours', 'total_stops', 'days_until_departure', 
            'is_weekend', 'is_holiday_season', 'route_popularity'
        ]
        
    def load_real_data(self, csv_path="../data/Indian Airlines.csv"):
        """Load real flight data from CSV"""
        try:
            print(f"Loading real flight data from {csv_path}...")
            df = pd.read_csv(csv_path)
            
            # Clean and prepare the data
            data = []
            for _, row in df.iterrows():
                try:
                    # Parse departure time category
                    departure_hour_map = {
                        'Early_Morning': 6,
                        'Morning': 9,
                        'Afternoon': 14,
                        'Evening': 18,
                        'Night': 21,
                        'Late_Night': 23
                    }
                    
                    departure_hour = departure_hour_map.get(row['departure_time'], 12)
                    
                    # Create a synthetic departure datetime for feature extraction
                    base_date = datetime(2024, 6, 15)  # Fixed date for consistency
                    departure_time = base_date.replace(hour=departure_hour)
                    
                    # Map stops
                    stops_map = {'zero': 0, 'one': 1, 'two': 2}
                    total_stops = stops_map.get(row['stops'], 0)
                    
                    # Parse duration (assuming it's in hours)
                    journey_duration_hours = float(row['duration']) if pd.notna(row['duration']) else 2.0
                    
                    # Route popularity (major routes)
                    popular_routes = [('Delhi', 'Mumbai'), ('Mumbai', 'Bangalore'), ('Delhi', 'Bangalore'),
                                    ('Chennai', 'Mumbai'), ('Delhi', 'Chennai'), ('Mumbai', 'Chennai'),
                                    ('Kolkata', 'Mumbai'), ('Hyderabad', 'Mumbai'), ('Delhi', 'Kolkata')]
                    route_popularity = 1 if (row['source_city'], row['destination_city']) in popular_routes or \
                                      (row['destination_city'], row['source_city']) in popular_routes else 0
                    
                    # Check if weekend (assume random for historical data)
                    is_weekend = departure_time.weekday() >= 5
                    
                    # Holiday season
                    is_holiday_season = departure_time.month in [12, 1, 4, 5, 10]
                    
                    data.append({
                        'airline': row['airline'],
                        'source_city': row['source_city'],
                        'destination_city': row['destination_city'],
                        'departure_time': departure_time,
                        'departure_hour': departure_hour,
                        'departure_day': departure_time.day,
                        'departure_month': departure_time.month,
                        'departure_weekday': departure_time.weekday(),
                        'journey_duration_hours': journey_duration_hours,
                        'total_stops': total_stops,
                        'days_until_departure': int(row['days_left']) if pd.notna(row['days_left']) else 30,
                        'is_weekend': int(is_weekend),
                        'is_holiday_season': int(is_holiday_season),
                        'route_popularity': route_popularity,
                        'price': int(row['price']) if pd.notna(row['price']) and row['price'] > 0 else 5000
                    })
                except Exception as e:
                    print(f"Error processing row: {e}")
                    continue
            
            print(f"Loaded {len(data)} flight records from CSV")
            return pd.DataFrame(data)
            
        except Exception as e:
            print(f"Error loading real data: {e}")
            print("Falling back to synthetic data...")
            return self.prepare_synthetic_data()

    def prepare_synthetic_data(self):
        """Generate synthetic flight data for training"""
        np.random.seed(42)
        
        # Indian airlines and cities
        airlines = ['IndiGo', 'SpiceJet', 'Air India', 'Vistara', 'AirAsia India', 'Akasa Air']
        cities = ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 
                 'Pune', 'Ahmedabad', 'Kochi', 'Goa', 'Jaipur', 'Lucknow']
        
        n_samples = 10000
        data = []
        
        for i in range(n_samples):
            airline = np.random.choice(airlines)
            source = np.random.choice(cities)
            destination = np.random.choice([c for c in cities if c != source])
            
            # Random departure time
            base_date = datetime(2024, 1, 1) + timedelta(days=np.random.randint(0, 365))
            departure_time = base_date + timedelta(hours=np.random.randint(5, 23))
            
            # Journey duration based on route
            duration_hours = np.random.uniform(1.5, 8.0)
            stops = np.random.choice([0, 1, 2], p=[0.6, 0.3, 0.1])
            
            # Days until departure (booking advance)
            days_until_departure = np.random.randint(1, 180)
            
            # Route popularity (major routes are more popular)
            popular_routes = [('Delhi', 'Mumbai'), ('Mumbai', 'Bangalore'), ('Delhi', 'Bangalore'),
                            ('Chennai', 'Mumbai'), ('Delhi', 'Chennai'), ('Mumbai', 'Chennai')]
            route_popularity = 1 if (source, destination) in popular_routes or (destination, source) in popular_routes else 0
            
            # Price calculation with realistic factors
            base_price = 3000
            
            # Airline factor
            airline_multiplier = {
                'IndiGo': 1.0, 'SpiceJet': 0.9, 'Air India': 1.2,
                'Vistara': 1.3, 'AirAsia India': 0.85, 'Akasa Air': 0.95
            }
            base_price *= airline_multiplier[airline]
            
            # Duration factor
            base_price += duration_hours * 200
            
            # Stops factor
            base_price *= (1 - stops * 0.15)
            
            # Advance booking factor
            if days_until_departure < 7:
                base_price *= 1.4
            elif days_until_departure < 30:
                base_price *= 1.1
            elif days_until_departure > 90:
                base_price *= 0.9
            
            # Weekend factor
            is_weekend = departure_time.weekday() >= 5
            if is_weekend:
                base_price *= 1.15
            
            # Holiday season factor
            is_holiday_season = departure_time.month in [12, 1, 4, 5, 10]
            if is_holiday_season:
                base_price *= 1.2
            
            # Route popularity factor
            if route_popularity:
                base_price *= 0.95  # Popular routes have more competition
            
            # Add some noise
            base_price *= np.random.uniform(0.8, 1.2)
            
            data.append({
                'airline': airline,
                'source_city': source,
                'destination_city': destination,
                'departure_time': departure_time,
                'departure_hour': departure_time.hour,
                'departure_day': departure_time.day,
                'departure_month': departure_time.month,
                'departure_weekday': departure_time.weekday(),
                'journey_duration_hours': duration_hours,
                'total_stops': stops,
                'days_until_departure': days_until_departure,
                'is_weekend': int(is_weekend),
                'is_holiday_season': int(is_holiday_season),
                'route_popularity': route_popularity,
                'price': max(1500, int(base_price))  # Minimum price floor
            })
        
        return pd.DataFrame(data)
    
    def encode_features(self, df, fit=True):
        """Encode categorical features"""
        categorical_columns = ['airline', 'source_city', 'destination_city']
        
        for col in categorical_columns:
            if fit:
                self.label_encoders[col] = LabelEncoder()
                df[f'{col}_encoded'] = self.label_encoders[col].fit_transform(df[col])
            else:
                # Handle unknown categories
                known_categories = set(self.label_encoders[col].classes_)
                df[f'{col}_encoded'] = df[col].apply(
                    lambda x: self.label_encoders[col].transform([x])[0] if x in known_categories else -1
                )
        
        return df
    
    def train_model(self):
        """Train the ML model"""
        print("Loading real flight data...")
        df = self.load_real_data()
        
        if df.empty:
            print("No data available, generating synthetic data...")
            df = self.prepare_synthetic_data()
        
        print("Encoding features...")
        df = self.encode_features(df, fit=True)
        
        print("Preparing training data...")
        X = df[self.feature_columns]
        y = df['price']
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42
        )
        
        print("Training Random Forest model...")
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=20,
            random_state=42,
            n_jobs=-1
        )
        
        self.model.fit(X_train, y_train)
        
        # Evaluate model
        y_pred = self.model.predict(X_test)
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        print(f"Model Performance:")
        print(f"Mean Absolute Error: ₹{mae:.2f}")
        print(f"R² Score: {r2:.4f}")
        
        return self.model
    
    def predict_price(self, flight_params):
        """Predict flight price for given parameters"""
        if self.model is None:
            raise ValueError("Model not trained. Call train_model() first.")
        
        # Create dataframe from parameters
        df = pd.DataFrame([flight_params])
        
        # Add derived features
        departure_time = datetime.strptime(flight_params['departure_date'] + ' ' + 
                                         flight_params.get('departure_time', '10:00'), '%Y-%m-%d %H:%M')
        
        df['departure_hour'] = departure_time.hour
        df['departure_day'] = departure_time.day
        df['departure_month'] = departure_time.month
        df['departure_weekday'] = departure_time.weekday()
        df['is_weekend'] = int(departure_time.weekday() >= 5)
        df['is_holiday_season'] = int(departure_time.month in [12, 1, 4, 5, 10])
        
        # Calculate days until departure
        days_until = (departure_time.date() - datetime.now().date()).days
        df['days_until_departure'] = max(0, days_until)
        
        # Route popularity
        popular_routes = [('Delhi', 'Mumbai'), ('Mumbai', 'Bangalore'), ('Delhi', 'Bangalore')]
        route = (flight_params['source_city'], flight_params['destination_city'])
        df['route_popularity'] = int(route in popular_routes or route[::-1] in popular_routes)
        
        # Encode categorical features
        df = self.encode_features(df, fit=False)
        
        # Prepare features
        X = df[self.feature_columns]
        X_scaled = self.scaler.transform(X)
        
        # Make prediction
        predicted_price = self.model.predict(X_scaled)[0]
        
        # Get prediction interval using Random Forest's prediction variance
        predictions = np.array([tree.predict(X_scaled)[0] for tree in self.model.estimators_])
        confidence = 1 - (np.std(predictions) / np.mean(predictions))
        
        return {
            'predicted_price': int(predicted_price),
            'confidence': min(max(confidence, 0.6), 0.95),  # Bound between 60-95%
            'price_range': {
                'min': int(predicted_price * 0.85),
                'max': int(predicted_price * 1.15)
            },
            'std_deviation': float(np.std(predictions))
        }
    
    def get_price_trend(self, source_city, destination_city, days_ahead=30):
        """Generate price trend for a route over specified days"""
        if self.model is None:
            raise ValueError("Model not trained. Call train_model() first.")
        
        trends = []
        base_date = datetime.now()
        
        for days_until in range(1, days_ahead + 1):
            departure_date = base_date + timedelta(days=days_until)
            
            # Create prediction parameters
            flight_params = {
                'airline': 'IndiGo',  # Use most common airline
                'source_city': source_city,
                'destination_city': destination_city,
                'departure_date': departure_date.strftime('%Y-%m-%d'),
                'departure_time': '10:00',
                'journey_duration_hours': 2.5,
                'total_stops': 0
            }
            
            try:
                prediction = self.predict_price(flight_params)
                trends.append({
                    'date': departure_date.strftime('%Y-%m-%d'),
                    'days_until': days_until,
                    'predicted_price': prediction['predicted_price'],
                    'day_of_week': departure_date.strftime('%A'),
                    'is_weekend': departure_date.weekday() >= 5
                })
            except Exception as e:
                print(f"Error predicting for day {days_until}: {e}")
                continue
        
        return trends
    
    def analyze_price_vs_current(self, current_price, source_city, destination_city, departure_date):
        """Analyze current price vs predicted trend"""
        try:
            # Get price trend for next 30 days
            trends = self.get_price_trend(source_city, destination_city, 30)
            
            if not trends:
                return {
                    'recommendation': 'Unable to analyze trend',
                    'confidence': 'low',
                    'action': 'book_now',
                    'trend_data': [],
                    'current_vs_predicted': {
                        'current_price': current_price,
                        'predicted_price': current_price,
                        'difference': 0,
                        'percentage_difference': 0.0
                    }
                }
            
            # Calculate statistics
            prices = [t['predicted_price'] for t in trends]
            avg_price = sum(prices) / len(prices)
            min_price = min(prices)
            max_price = max(prices)

            # Determine predicted price for the provided departure_date (closest day in trend)
            try:
                dep_date = datetime.strptime(departure_date, "%Y-%m-%d").date() if departure_date else datetime.today().date()
            except Exception:
                dep_date = datetime.today().date()
            today = datetime.today().date()
            days_until_dep = max((dep_date - today).days, 0)

            # Find the closest trend day to the requested departure date
            closest_item = None
            closest_delta = None
            for item in trends:
                delta = abs(item.get('days_until', 0) - days_until_dep)
                if closest_delta is None or delta < closest_delta:
                    closest_delta = delta
                    closest_item = item

            predicted_for_departure = round(closest_item['predicted_price']) if closest_item else round(avg_price)
            
            # Find best price days
            best_price_days = sorted(trends, key=lambda x: x['predicted_price'])[:5]
            
            # Generate recommendation
            if current_price <= min_price * 1.05:  # Within 5% of minimum
                recommendation = "Excellent deal! Book immediately - this is close to the lowest predicted price."
                action = "book_now"
                confidence = "high"
            elif current_price <= avg_price * 0.9:  # 10% below average
                recommendation = "Good deal! Consider booking - price is below average."
                action = "book_soon"
                confidence = "medium"
            elif current_price <= avg_price * 1.1:  # Within 10% of average
                recommendation = "Average price. You might find slightly better deals by waiting."
                action = "wait_and_watch"
                confidence = "medium"
            else:  # Above average
                recommendation = "Price is above average. Consider waiting for better deals."
                action = "wait"
                confidence = "high"
            
            # Calculate trend direction
            recent_prices = prices[:7]  # Next 7 days
            later_prices = prices[7:14] if len(prices) > 14 else prices[7:]
            
            trend_direction = "stable"
            if later_prices and recent_prices:
                recent_avg = sum(recent_prices) / len(recent_prices)
                later_avg = sum(later_prices) / len(later_prices)
                if later_avg > recent_avg * 1.05:
                    trend_direction = "increasing"
                elif later_avg < recent_avg * 0.95:
                    trend_direction = "decreasing"
            
            return {
                'recommendation': recommendation,
                'confidence': confidence,
                'action': action,
                'current_vs_predicted': {
                    'current_price': current_price,
                    'predicted_price': predicted_for_departure,
                    'difference': int(current_price - predicted_for_departure),
                    'percentage_difference': round(((current_price - predicted_for_departure) / max(predicted_for_departure, 1)) * 100, 1)
                },
                'current_vs_average': {
                    'current_price': current_price,
                    'average_price': round(avg_price),
                    'difference_percent': round(((current_price - avg_price) / avg_price) * 100, 1),
                    'vs_minimum': round(((current_price - min_price) / min_price) * 100, 1),
                    'vs_maximum': round(((current_price - max_price) / max_price) * 100, 1)
                },
                'trend_direction': trend_direction,
                'best_booking_days': [
                    {
                        'date': day['date'],
                        'price': day['predicted_price'],
                        'days_until': day['days_until'],
                        'day_of_week': day['day_of_week']
                    } for day in best_price_days
                ],
                'trend_data': trends[:14],  # Return 2 weeks of trend data
                'price_stats': {
                    'min': min_price,
                    'max': max_price,
                    'average': round(avg_price),
                    'range': max_price - min_price
                }
            }
            
        except Exception as e:
            print(f"Error in price analysis: {e}")
            return {
                'recommendation': 'Unable to analyze price trend',
                'confidence': 'low',
                'action': 'book_now',
                'trend_data': []
            }

    def save_model(self, model_dir='models'):
        """Save the trained model and encoders"""
        os.makedirs(model_dir, exist_ok=True)
        
        if self.model:
            joblib.dump(self.model, f'{model_dir}/flight_price_model.pkl')
            joblib.dump(self.label_encoders, f'{model_dir}/label_encoders.pkl')
            joblib.dump(self.scaler, f'{model_dir}/scaler.pkl')
            print(f"Model saved to {model_dir}/")
    
    def load_model(self, model_dir='models'):
        """Load the trained model and encoders"""
        try:
            self.model = joblib.load(f'{model_dir}/flight_price_model.pkl')
            self.label_encoders = joblib.load(f'{model_dir}/label_encoders.pkl')
            self.scaler = joblib.load(f'{model_dir}/scaler.pkl')
            print("Model loaded successfully!")
            return True
        except Exception as e:
            print(f"Error loading model: {e}")
            return False

# Train and save model when run directly
if __name__ == "__main__":
    model = FlightPriceMLModel()
    model.train_model()
    model.save_model()
    
    # Test prediction
    test_params = {
        'airline': 'IndiGo',
        'source_city': 'Delhi',
        'destination_city': 'Mumbai',
        'departure_date': '2024-12-25',
        'departure_time': '10:00',
        'journey_duration_hours': 2.5,
        'total_stops': 0
    }
    
    result = model.predict_price(test_params)
    print(f"\nTest Prediction: ₹{result['predicted_price']} (Confidence: {result['confidence']:.2%})")
