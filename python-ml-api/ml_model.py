"""Flight price prediction model.

Design notes
------------
This is a *tabular regression* problem (price as a function of route, airline,
class, stops, duration, booking window and calendar date) -- not a univariate
time-series forecasting problem, so a gradient-boosted tree model is a much
better fit than a sequence model such as Amazon Chronos. We train a single
``HistGradientBoostingRegressor`` because it:

* is consistently more accurate than RandomForest on tabular data,
* trains in seconds and serialises to a few MB (the old RF was ~70 MB),
* natively handles missing values -- which is the key to combining datasets.

We combine two complementary datasets:

* ``Indian Airlines.csv`` -- has ``days_left`` (the booking-window signal that
  drives "when to book") but no real calendar date.
* ``goibibo_flights_data.csv`` -- has real flight dates and real departure
  times (genuine month / weekday / hour seasonality) but no ``days_left``.

Each dataset is missing the column the other provides; the model learns the
booking-window effect from one and the calendar-seasonality effect from the
other, while sharing the airline/route/class/stops/duration signal. Quantile
models (10th / 90th percentile) give honest prediction intervals and confidence.
"""

import os
import re
import json
import warnings
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

warnings.filterwarnings('ignore')

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')

# Departure-time *category* -> representative hour (Indian Airlines uses buckets)
DEPARTURE_HOUR_MAP = {
    'Early_Morning': 7, 'Morning': 10, 'Afternoon': 14,
    'Evening': 18, 'Night': 21, 'Late_Night': 1,
}

POPULAR_ROUTES = {
    ('New Delhi', 'Mumbai'), ('Mumbai', 'Bangalore'), ('New Delhi', 'Bangalore'),
    ('Chennai', 'Mumbai'), ('New Delhi', 'Chennai'), ('Mumbai', 'Chennai'),
    ('Kolkata', 'Mumbai'), ('Hyderabad', 'Mumbai'), ('New Delhi', 'Kolkata'),
    ('New Delhi', 'Hyderabad'), ('Bangalore', 'Kolkata'),
}


def normalize_airline(name):
    if not isinstance(name, str):
        return 'Unknown'
    key = name.strip().lower().replace('_', ' ')
    mapping = {
        'indigo': 'IndiGo',
        'air india': 'Air India', 'air india express': 'Air India',
        'go first': 'GO FIRST', 'go_first': 'GO FIRST', 'goair': 'GO FIRST',
        'gofirst': 'GO FIRST',
        'airasia': 'AirAsia', 'airasia india': 'AirAsia',
        'spicejet': 'SpiceJet', 'vistara': 'Vistara',
        'akasa air': 'Akasa Air', 'star air': 'Star Air', 'starair': 'Star Air',
        'trujet': 'TruJet', 'alliance air (india)': 'Alliance Air',
        'jet airways': 'Jet Airways',
    }
    return mapping.get(key, name.strip())


def normalize_city(name):
    if not isinstance(name, str):
        return 'Unknown'
    key = name.strip().lower()
    # Primary names kept in sync with src/lib/cities.ts canonicalCity().
    mapping = {
        'new delhi': 'New Delhi', 'delhi': 'New Delhi',
        'mumbai': 'Mumbai', 'bombay': 'Mumbai',
        'bangalore': 'Bangalore', 'bengaluru': 'Bangalore',
        'chennai': 'Chennai', 'madras': 'Chennai',
        'kolkata': 'Kolkata', 'calcutta': 'Kolkata',
        'hyderabad': 'Hyderabad',
    }
    return mapping.get(key, name.strip().title())


def parse_stops(value):
    """Map varied stop encodings ('zero'/'one', 'non-stop'/'1-stop', 2) -> int."""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return 0
    s = str(value).strip().lower()
    words = {'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'non-stop': 0, 'nonstop': 0}
    if s in words:
        return words[s]
    if s.startswith('non'):
        return 0
    m = re.search(r'(\d+)', s)
    return min(int(m.group(1)), 3) if m else 0


def parse_duration_hours(value):
    """Accept '2.17' (hours) or '02h 10m' -> float hours."""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return np.nan
    s = str(value).strip()
    try:
        return float(s)
    except ValueError:
        pass
    h = re.search(r'(\d+)\s*h', s)
    m = re.search(r'(\d+)\s*m', s)
    hours = int(h.group(1)) if h else 0
    minutes = int(m.group(1)) if m else 0
    total = hours + minutes / 60.0
    return total if total > 0 else np.nan


def parse_clock_hour(value):
    """Extract the hour from a 'HH:MM' clock string."""
    if not isinstance(value, str):
        return np.nan
    m = re.match(r'\s*(\d{1,2})\s*:', value)
    return int(m.group(1)) if m else np.nan


def clean_price(value):
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return np.nan
    s = re.sub(r'[^\d.]', '', str(value))  # strip currency, commas, quotes
    try:
        return float(s)
    except ValueError:
        return np.nan


def route_popularity(source, destination):
    return int((source, destination) in POPULAR_ROUTES or
               (destination, source) in POPULAR_ROUTES)


class FlightPriceMLModel:
    # Order matters: this is the column order fed to the estimators.
    feature_columns = [
        'airline_code', 'source_code', 'destination_code', 'class_code',
        'total_stops', 'journey_duration_hours', 'departure_hour',
        'days_until_departure', 'departure_month', 'departure_weekday',
        'is_weekend', 'route_popularity',
    ]

    def __init__(self):
        self.model = None            # median estimator
        self.lower_model = None      # 10th percentile
        self.upper_model = None      # 90th percentile
        self.categories = {}         # column -> {value: code}
        self.metrics = {}

    # ------------------------------------------------------------------ data
    def load_indian_airlines(self, csv_path=None):
        csv_path = csv_path or os.path.join(DATA_DIR, 'Indian Airlines.csv')
        if not os.path.exists(csv_path):
            return pd.DataFrame()
        df = pd.read_csv(csv_path)
        out = pd.DataFrame({
            'airline': df['airline'].map(normalize_airline),
            'source_city': df['source_city'].map(normalize_city),
            'destination_city': df['destination_city'].map(normalize_city),
            'travel_class': df['class'].astype(str).str.strip().str.lower(),
            'total_stops': df['stops'].map(parse_stops),
            'journey_duration_hours': df['duration'].map(parse_duration_hours),
            'departure_hour': df['departure_time'].map(
                lambda v: DEPARTURE_HOUR_MAP.get(v, 12)),
            'days_until_departure': pd.to_numeric(df['days_left'], errors='coerce'),
            # No real calendar date in this dataset -> leave seasonality missing.
            'departure_month': np.nan,
            'departure_weekday': np.nan,
            'is_weekend': np.nan,
            'price': df['price'].map(clean_price),
        })
        return out

    def load_goibibo(self, csv_path=None):
        csv_path = csv_path or os.path.join(DATA_DIR, 'goibibo_flights_data.csv')
        if not os.path.exists(csv_path):
            return pd.DataFrame()
        df = pd.read_csv(csv_path, dtype=str, on_bad_lines='skip')
        date = pd.to_datetime(df['flight date'], format='%d-%m-%Y', errors='coerce')
        out = pd.DataFrame({
            'airline': df['airline'].map(normalize_airline),
            'source_city': df['from'].map(normalize_city),
            'destination_city': df['to'].map(normalize_city),
            'travel_class': df['class'].astype(str).str.strip().str.lower(),
            'total_stops': df['stops'].map(parse_stops),
            'journey_duration_hours': df['duration'].map(parse_duration_hours),
            'departure_hour': df['dep_time'].map(parse_clock_hour),
            # Real scrape window is unknown -> booking window is missing here.
            'days_until_departure': np.nan,
            'departure_month': date.dt.month,
            'departure_weekday': date.dt.weekday,
            'is_weekend': (date.dt.weekday >= 5).astype('float'),
            'price': df['price'].map(clean_price),
        })
        return out

    def load_real_data(self):
        """Combined, cleaned training frame from all available datasets."""
        frames = [self.load_indian_airlines(), self.load_goibibo()]
        frames = [f for f in frames if not f.empty]
        if not frames:
            print('No real datasets found, using synthetic data.')
            return self.prepare_synthetic_data()

        df = pd.concat(frames, ignore_index=True)

        # Normalise class to a small known set, default to economy.
        df['travel_class'] = df['travel_class'].where(
            df['travel_class'].isin(['economy', 'business']), 'economy')

        # Derived feature shared by both datasets.
        df['route_popularity'] = [
            route_popularity(s, d)
            for s, d in zip(df['source_city'], df['destination_city'])
        ]

        # Drop unusable rows and clip obvious outliers.
        df = df[df['price'].notna() & (df['price'] >= 1000) & (df['price'] <= 300000)]
        df['journey_duration_hours'] = df['journey_duration_hours'].fillna(2.5)
        df = df.reset_index(drop=True)
        print(f'Loaded {len(df):,} flight records from real datasets '
              f'({len(frames)} source files).')
        return df

    def prepare_synthetic_data(self):
        """Lightweight fallback if the CSVs are unavailable."""
        np.random.seed(42)
        airlines = ['IndiGo', 'SpiceJet', 'Air India', 'Vistara', 'AirAsia', 'GO FIRST']
        cities = ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad']
        rows = []
        for _ in range(8000):
            source = np.random.choice(cities)
            dest = np.random.choice([c for c in cities if c != source])
            cls = np.random.choice(['economy', 'business'], p=[0.8, 0.2])
            stops = np.random.choice([0, 1, 2], p=[0.6, 0.3, 0.1])
            duration = float(np.random.uniform(1.5, 8.0))
            days_left = int(np.random.randint(1, 60))
            price = 3000 + duration * 250 + (8000 if cls == 'business' else 0)
            price *= 1.4 if days_left < 7 else 0.9 if days_left > 45 else 1.0
            price *= np.random.uniform(0.85, 1.15)
            rows.append({
                'airline': np.random.choice(airlines), 'source_city': source,
                'destination_city': dest, 'travel_class': cls,
                'total_stops': stops, 'journey_duration_hours': duration,
                'departure_hour': int(np.random.randint(5, 23)),
                'days_until_departure': days_left, 'departure_month': np.nan,
                'departure_weekday': np.nan, 'is_weekend': np.nan,
                'route_popularity': route_popularity(source, dest),
                'price': max(1500, int(price)),
            })
        return pd.DataFrame(rows)

    # -------------------------------------------------------------- encoding
    def _fit_encoders(self, df):
        for col, src in [('airline_code', 'airline'),
                         ('source_code', 'source_city'),
                         ('destination_code', 'destination_city'),
                         ('class_code', 'travel_class')]:
            cats = sorted(df[src].dropna().astype(str).unique())
            self.categories[col] = {v: i for i, v in enumerate(cats)}

    def _encode(self, df):
        df = df.copy()
        for col, src in [('airline_code', 'airline'),
                         ('source_code', 'source_city'),
                         ('destination_code', 'destination_city'),
                         ('class_code', 'travel_class')]:
            lookup = self.categories[col]
            df[col] = df[src].astype(str).map(lambda v: lookup.get(v, -1))
        return df

    # --------------------------------------------------------------- training
    def train_model(self):
        df = self.load_real_data()
        if df.empty:
            df = self.prepare_synthetic_data()

        self._fit_encoders(df)
        df = self._encode(df)

        X = df[self.feature_columns]
        y = df['price']
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42)

        def make(quantile=None):
            loss = 'quantile' if quantile is not None else 'squared_error'
            return HistGradientBoostingRegressor(
                loss=loss, quantile=quantile, max_iter=400, learning_rate=0.06,
                max_depth=None, max_leaf_nodes=63, min_samples_leaf=40,
                l2_regularization=1.0, random_state=42)

        print('Training gradient boosting models (median + quantiles)...')
        self.model = make().fit(X_train, y_train)
        self.lower_model = make(0.1).fit(X_train, y_train)
        self.upper_model = make(0.9).fit(X_train, y_train)

        y_pred = self.model.predict(X_test)
        self.metrics = {
            'mae': round(float(mean_absolute_error(y_test, y_pred)), 2),
            'r2': round(float(r2_score(y_test, y_pred)), 4),
            'samples': int(len(df)),
            'trained_at': datetime.now().isoformat(),
        }
        print(f"Model performance -> MAE: Rs.{self.metrics['mae']:.0f} | "
              f"R2: {self.metrics['r2']:.4f} | rows: {self.metrics['samples']:,}")
        return self.model

    # ------------------------------------------------------------ prediction
    def _row_from_params(self, params):
        airline = normalize_airline(params.get('airline', 'IndiGo'))
        source = normalize_city(params['source_city'])
        dest = normalize_city(params['destination_city'])
        cls = str(params.get('travel_class', 'economy')).strip().lower()
        if cls not in ('economy', 'business'):
            cls = 'economy'

        dep_time = params.get('departure_time', '10:00')
        hour = parse_clock_hour(dep_time)
        if np.isnan(hour):
            hour = DEPARTURE_HOUR_MAP.get(dep_time, 12)

        dep = datetime.strptime(params['departure_date'], '%Y-%m-%d')
        days_until = max(0, (dep.date() - datetime.now().date()).days)

        row = {
            'airline': airline, 'source_city': source, 'destination_city': dest,
            'travel_class': cls,
            'total_stops': int(params.get('total_stops', 0) or 0),
            'journey_duration_hours': float(params.get('journey_duration_hours', 2.5) or 2.5),
            'departure_hour': int(hour),
            'days_until_departure': days_until,
            'departure_month': dep.month,
            'departure_weekday': dep.weekday(),
            'is_weekend': float(dep.weekday() >= 5),
            'route_popularity': route_popularity(source, dest),
        }
        return self._encode(pd.DataFrame([row]))[self.feature_columns]

    def predict_price(self, flight_params):
        if self.model is None:
            raise ValueError('Model not trained. Call train_model() first.')

        X = self._row_from_params(flight_params)
        median = float(self.model.predict(X)[0])
        lower = float(self.lower_model.predict(X)[0])
        upper = float(self.upper_model.predict(X)[0])
        lower, upper = min(lower, median), max(upper, median)

        # Confidence: tighter interval (relative to price) -> higher confidence.
        spread = (upper - lower) / max(median, 1)
        confidence = float(np.clip(1 - spread / 2, 0.6, 0.97))

        return {
            'predicted_price': int(round(median)),
            'confidence': round(confidence, 3),
            'price_range': {'min': int(round(lower)), 'max': int(round(upper))},
            'std_deviation': float(round((upper - lower) / 3.29, 2)),  # ~90% CI -> sigma
        }

    def get_price_trend(self, source_city, destination_city, days_ahead=30,
                        travel_class='economy'):
        if self.model is None:
            raise ValueError('Model not trained. Call train_model() first.')
        trends = []
        base = datetime.now()
        for days_until in range(1, days_ahead + 1):
            dep = base + timedelta(days=days_until)
            try:
                pred = self.predict_price({
                    'airline': 'IndiGo', 'source_city': source_city,
                    'destination_city': destination_city,
                    'departure_date': dep.strftime('%Y-%m-%d'),
                    'departure_time': '10:00', 'journey_duration_hours': 2.5,
                    'total_stops': 0, 'travel_class': travel_class,
                })
                trends.append({
                    'date': dep.strftime('%Y-%m-%d'), 'days_until': days_until,
                    'predicted_price': pred['predicted_price'],
                    'day_of_week': dep.strftime('%A'),
                    'is_weekend': dep.weekday() >= 5,
                })
            except Exception as exc:
                print(f'Trend prediction failed for day {days_until}: {exc}')
        return trends

    def get_fare_calendar(self, source_city, destination_city, days_ahead=60,
                          travel_class='economy'):
        """Per-date predicted fares over a horizon, tagged low/medium/high for a
        colour-coded "cheapest day to fly" calendar."""
        trends = self.get_price_trend(source_city, destination_city, days_ahead,
                                      travel_class)
        if not trends:
            return {'days': [], 'cheapest': None, 'min_price': 0,
                    'max_price': 0, 'avg_price': 0}

        prices = [t['predicted_price'] for t in trends]
        lo, hi = min(prices), max(prices)
        span = max(hi - lo, 1)
        for t in trends:
            frac = (t['predicted_price'] - lo) / span
            t['level'] = 'low' if frac <= 0.34 else 'medium' if frac <= 0.67 else 'high'

        cheapest = min(trends, key=lambda t: t['predicted_price'])
        return {
            'route': f'{normalize_city(source_city)} -> {normalize_city(destination_city)}',
            'travel_class': travel_class,
            'days': trends,
            'cheapest': cheapest,
            'min_price': lo,
            'max_price': hi,
            'avg_price': round(sum(prices) / len(prices)),
        }

    def analyze_price_vs_current(self, current_price, source_city,
                                 destination_city, departure_date):
        try:
            trends = self.get_price_trend(source_city, destination_city, 30)
            if not trends:
                raise ValueError('no trend data')

            prices = [t['predicted_price'] for t in trends]
            avg_price = sum(prices) / len(prices)
            min_price, max_price = min(prices), max(prices)

            try:
                dep_date = datetime.strptime(departure_date, '%Y-%m-%d').date()
            except Exception:
                dep_date = datetime.today().date()
            days_until_dep = max((dep_date - datetime.today().date()).days, 0)

            closest = min(trends, key=lambda t: abs(t['days_until'] - days_until_dep))
            predicted_for_departure = closest['predicted_price']

            # Judge the deal against the model's expectation *for the user's own
            # departure date* (which accounts for booking window + seasonality),
            # not against a rolling 30-day average of unrelated near-term dates.
            ratio = current_price / max(predicted_for_departure, 1)
            if ratio <= 0.90:
                recommendation = ('Excellent deal! This is well below the predicted '
                                  'price for your date - book now.')
                action, confidence = 'book_now', 'high'
            elif ratio <= 1.03:
                recommendation = ('Good price - close to or below the predicted price '
                                  'for your date. Booking now is sensible.')
                action, confidence = 'book_soon', 'medium'
            elif ratio <= 1.15:
                recommendation = ('Slightly above the predicted price. You may find a '
                                  'better deal by waiting.')
                action, confidence = 'wait_and_watch', 'medium'
            else:
                recommendation = ('Well above the predicted price for your date. '
                                  'Consider waiting for a drop.')
                action, confidence = 'wait', 'high'

            recent = prices[:7]
            later = prices[7:14] if len(prices) > 14 else prices[7:]
            trend_direction = 'stable'
            if recent and later:
                r, l = sum(recent) / len(recent), sum(later) / len(later)
                trend_direction = ('increasing' if l > r * 1.05
                                   else 'decreasing' if l < r * 0.95 else 'stable')

            best_days = sorted(trends, key=lambda t: t['predicted_price'])[:5]
            return {
                'recommendation': recommendation, 'confidence': confidence,
                'action': action,
                'current_vs_predicted': {
                    'current_price': current_price,
                    'predicted_price': predicted_for_departure,
                    'difference': int(current_price - predicted_for_departure),
                    'percentage_difference': round(
                        ((current_price - predicted_for_departure) /
                         max(predicted_for_departure, 1)) * 100, 1),
                },
                'current_vs_average': {
                    'current_price': current_price, 'average_price': round(avg_price),
                    'difference_percent': round(((current_price - avg_price) / avg_price) * 100, 1),
                    'vs_minimum': round(((current_price - min_price) / min_price) * 100, 1),
                    'vs_maximum': round(((current_price - max_price) / max_price) * 100, 1),
                },
                'trend_direction': trend_direction,
                'best_booking_days': [
                    {'date': d['date'], 'price': d['predicted_price'],
                     'days_until': d['days_until'], 'day_of_week': d['day_of_week']}
                    for d in best_days
                ],
                'trend_data': trends[:14],
                'price_stats': {
                    'min': min_price, 'max': max_price,
                    'average': round(avg_price), 'range': max_price - min_price,
                },
            }
        except Exception as exc:
            print(f'Error in price analysis: {exc}')
            return {
                'recommendation': 'Unable to analyze price trend',
                'confidence': 'low', 'action': 'book_now', 'trend_data': [],
                'current_vs_predicted': {
                    'current_price': current_price, 'predicted_price': current_price,
                    'difference': 0, 'percentage_difference': 0.0,
                },
            }

    def get_known_cities(self):
        """Cities the model was trained on, derived from the fitted encoders
        (avoids re-parsing the full CSV on every request)."""
        cities = set(self.categories.get('source_code', {}).keys())
        cities |= set(self.categories.get('destination_code', {}).keys())
        return sorted(c for c in cities if c and c != 'Unknown')

    # ---------------------------------------------------------- persistence
    def save_model(self, model_dir='models'):
        os.makedirs(model_dir, exist_ok=True)
        if self.model is None:
            return
        joblib.dump({
            'model': self.model, 'lower_model': self.lower_model,
            'upper_model': self.upper_model, 'categories': self.categories,
            'feature_columns': self.feature_columns, 'metrics': self.metrics,
        }, os.path.join(model_dir, 'flight_price_model.pkl'))
        with open(os.path.join(model_dir, 'metrics.json'), 'w') as fh:
            json.dump(self.metrics, fh, indent=2)
        print(f'Model saved to {model_dir}/')

    def load_model(self, model_dir='models'):
        try:
            bundle = joblib.load(os.path.join(model_dir, 'flight_price_model.pkl'))
            if not isinstance(bundle, dict) or 'lower_model' not in bundle:
                print('Found an old model format - retraining required.')
                return False
            self.model = bundle['model']
            self.lower_model = bundle['lower_model']
            self.upper_model = bundle['upper_model']
            self.categories = bundle['categories']
            self.metrics = bundle.get('metrics', {})
            print('Model loaded successfully!')
            return True
        except Exception as exc:
            print(f'Error loading model: {exc}')
            return False


if __name__ == '__main__':
    model = FlightPriceMLModel()
    model.train_model()
    model.save_model()

    for cls in ('economy', 'business'):
        result = model.predict_price({
            'airline': 'IndiGo', 'source_city': 'Delhi',
            'destination_city': 'Mumbai', 'departure_date': '2025-12-25',
            'departure_time': '10:00', 'journey_duration_hours': 2.5,
            'total_stops': 0, 'travel_class': cls,
        })
        print(f"\nDelhi->Mumbai ({cls}): Rs.{result['predicted_price']} "
              f"(range {result['price_range']['min']}-{result['price_range']['max']}, "
              f"confidence {result['confidence']:.0%})")
