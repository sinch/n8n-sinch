#!/bin/bash
# Refresh n8n instance with latest connector build
# This script builds the connector, restarts Docker, and reinstalls the package

set -e  # Exit on error

echo "🔨 Building connector..."
cd "$(dirname "$0")"
npm run build

echo "🐳 Restarting n8n Docker container..."
cd ../n8n-docker
docker-compose restart n8n

echo "⏳ Waiting for n8n to start..."
sleep 5

echo "📦 Reinstalling connector in Docker container..."
docker-compose exec -T n8n npm install --prefix /home/node/.n8n/custom

echo "✅ Done! n8n is ready for testing at http://localhost:5678"

