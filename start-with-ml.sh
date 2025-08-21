#!/bin/bash

echo "🚀 Starting TripTactix with Real ML Backend"
echo "==========================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"  
    exit 1
fi

# Function to cleanup background processes
cleanup() {
    echo "🧹 Cleaning up processes..."
    if [[ ! -z "$ML_API_PID" ]]; then
        kill $ML_API_PID 2>/dev/null
    fi
    if [[ ! -z "$NEXT_PID" ]]; then  
        kill $NEXT_PID 2>/dev/null
    fi
    exit 0
}

# Set up signal handling
trap cleanup SIGINT SIGTERM

echo "🐍 Setting up Python ML API..."

# Navigate to ML API directory
cd python-ml-api

# Create virtual environment if it doesn't exist
if [[ ! -d "venv" ]]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📥 Installing Python dependencies..."
pip install -q -r requirements.txt

# Train model if it doesn't exist
if [[ ! -d "models" ]]; then
    echo "🤖 Training initial ML model..."
    python ml_model.py
fi

# Start ML API in background
echo "🔥 Starting ML API server on port 8000..."
uvicorn main:app --host 0.0.0.0 --port 8000 --log-level info &
ML_API_PID=$!

# Wait for ML API to start
echo "⏳ Waiting for ML API to start..."
sleep 5

# Test ML API
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ ML API is running at http://localhost:8000"
    echo "📚 API Documentation at http://localhost:8000/docs"
else
    echo "❌ Failed to start ML API"
    cleanup
    exit 1
fi

# Navigate back to project root
cd ..

# Start Next.js development server
echo "⚡ Starting Next.js development server..."
npm run dev &
NEXT_PID=$!

# Wait for Next.js to start
echo "⏳ Waiting for Next.js to start..."
sleep 10

if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Next.js is running at http://localhost:3000"
else
    echo "❌ Failed to start Next.js"
    cleanup
    exit 1
fi

echo ""
echo "🎉 TripTactix is now running with Real ML!"
echo "==========================================="
echo "🌐 Frontend: http://localhost:3000"
echo "🤖 ML API:   http://localhost:8000"
echo "📚 ML Docs:  http://localhost:8000/docs"
echo ""
echo "🧪 Test ML prediction:"
echo "curl -X POST http://localhost:8000/predict \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"airline\":\"IndiGo\",\"source_city\":\"Delhi\",\"destination_city\":\"Mumbai\",\"departure_date\":\"2024-12-25\"}'"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user interrupt
wait
