#!/bin/bash

# Triptactix Deployment Script for Cloudflare Pages
echo "🚀 Starting Triptactix deployment to Cloudflare Pages..."

# Build the application
echo "📦 Building the application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Deploy to Cloudflare Pages
    echo "🌍 Deploying to Cloudflare Pages..."
    npx wrangler pages deploy out --project-name=triptactix --commit-dirty=true
    
    if [ $? -eq 0 ]; then
        echo "🎉 Deployment successful!"
        echo "🌐 Your app is live at: https://triptactix.pages.dev"
    else
        echo "❌ Deployment failed!"
        exit 1
    fi
else
    echo "❌ Build failed!"
    exit 1
fi
