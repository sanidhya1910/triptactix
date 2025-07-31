#!/bin/bash

# Environment Variables Setup Script for Cloudflare Pages
echo "🔧 Setting up environment variables for Triptactix on Cloudflare Pages..."

export CLOUDFLARE_API_TOKEN="DED-SZdsHNybSfYLcOYo-Dp9fuEKGY1ICoAceC7X"

# Set the essential environment variables
echo "Setting GEMINI_API_KEY..."
echo "AIzaSyDNSS6NUH1Ie00L4_IANYajnC7Sw_jN99s" | npx wrangler pages secret put GEMINI_API_KEY --project-name=triptactix

echo "Setting RAPIDAPI_KEY..."
echo "1f36d7b753msh309fb339b1b25f8p1d5dd4jsn218e2b23ae8b" | npx wrangler pages secret put RAPIDAPI_KEY --project-name=triptactix

echo "Setting NEXTAUTH_SECRET..."
echo "your-nextauth-secret-key-here-for-production" | npx wrangler pages secret put NEXTAUTH_SECRET --project-name=triptactix

echo "✅ Environment variables setup complete!"
echo "🌐 Your Triptactix app is ready at: https://triptactix.pages.dev"
