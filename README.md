# Triptactix 🌍

> AI-Powered Travel Planning & Booking Platform for India

A modern travel platform that generates personalized itineraries using AI, compares flights/trains/hotels, and provides price predictions - all optimized for Indian travel.

## ✨ Features

- **AI Itinerary Generator** - Create detailed travel plans with Groq LLMs
- **Multi-Modal Search** - Compare flights and trains (live flights via SerpAPI / Google Flights)
- **Price Predictions** - A real gradient-boosting model (R² ≈ 0.97) trained on 600K+ Indian flight records forecasts fares and the best time to book
- **India-Focused** - Optimized for Indian destinations with INR pricing
- **Responsive Design** - Works seamlessly on all devices

## 🚀 Live Demo

**Production URL**: https://triptactix.pages.dev

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Heroicons** - Beautiful icons

### Backend
- **Cloudflare Pages Functions** - Serverless API endpoints
- **Cloudflare D1** - SQLite-compatible database
- **Prisma ORM** - Database management
- **NextAuth.js** - Authentication (ready)

### AI & APIs
- **Groq LLMs** - Intelligent itinerary generation
- **SerpAPI (Google Flights)** - Live flight search
- **Python ML API** - FastAPI service serving the flight-price model (see `python-ml-api/`)
- **Recharts** - Price prediction visualizations

### Infrastructure
- **Cloudflare Pages** - Global CDN hosting
- **Edge Computing** - Sub-100ms response times
- **Automatic HTTPS** - SSL certificates
- **300+ Edge Locations** - Worldwide distribution

## 🏃‍♂️ Quick Start

```bash
# Clone repository
git clone <repository-url>
cd triptactix

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your API keys (Gemini, RapidAPI)

# Run development server
npm run dev
```

Visit `http://localhost:3000` to see the app.

## 📁 Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # Reusable UI components
├── lib/                 # Utilities and API clients
├── types/               # TypeScript definitions
functions/
├── api/                 # Cloudflare Functions (backend)
prisma/
├── schema.prisma        # Database schema
```

## 🚀 Deployment

The app is deployed on Cloudflare with automatic deployments:

```bash
# Deploy to production
npm run build
npx wrangler pages deploy out --project-name=triptactix
```

## 🔧 Environment Variables

```env
GROQ_API_KEY=your_groq_api_key
SERPAPI_KEY=your_serpapi_key
NEXTAUTH_SECRET=your_secret_key
# Optional: point the frontend at a hosted Python ML API (defaults to http://localhost:8000)
ML_API_URL=http://localhost:8000
```

## 📊 Key Metrics

- **Build Time**: ~3 seconds
- **Global Edge**: 300+ locations
- **Database**: 20 tables with full travel schema
- **Uptime**: 99.99% SLA

## 🎯 Features in Detail

- **Smart Itineraries**: AI analyzes preferences to create personalized travel plans
- **Real-time Search**: Live flight, train, and hotel availability
- **Price Intelligence**: Predict future prices and optimal booking times
- **Indian Focus**: Supports Indian Railways, domestic flights, and local accommodations
- **Currency**: All pricing in Indian Rupees (INR)

## 🏗️ Architecture

```
User → Cloudflare Edge → Static Assets + API Functions → D1 Database → External APIs
```

Built with modern web technologies for scalability, performance, and user experience.

---

**Made with ❤️ for Indian travelers**
