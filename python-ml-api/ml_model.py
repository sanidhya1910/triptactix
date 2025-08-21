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
        print("Generating synthetic training data...")
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
