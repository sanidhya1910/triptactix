#!/bin/bash

echo "Setting up Python ML API for TripTactix..."

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Train the initial model
echo "Training initial ML model..."
python ml_model.py

echo "Setup complete! To start the API server:"
echo "1. Activate virtual environment: source venv/bin/activate"
echo "2. Start server: uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
echo "3. API will be available at http://localhost:8000"
echo "4. Interactive docs at http://localhost:8000/docs"
