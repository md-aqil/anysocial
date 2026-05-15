#!/bin/bash
set -e

# Configuration
APP_DIR="/var/www/socialsched"
BACKEND_SERVICE="socialsched-backend"
FRONTEND_SERVICE="socialsched-frontend"

echo "------------------------------------------------"
echo "🚀 Starting Deployment for SocialSched"
echo "------------------------------------------------"

# Navigate to app directory
cd $APP_DIR

# Pull latest code (reset --hard to handle any untracked build files on VPS)
echo "📥 Pulling latest code from main..."
git fetch origin
git reset --hard origin/main

# Backend setup
echo "📦 Setting up Backend..."
npm install

# Run database migrations
echo "🗄️ Running Prisma migrations..."
if [ -f "/etc/socialsched/.env" ]; then
    export $(grep -v '^#' /etc/socialsched/.env | xargs)
    npx prisma migrate deploy
else
    echo "Warning: /etc/socialsched/.env not found, using existing environment for migration"
    npx prisma migrate deploy
fi

echo "🏗️ Building Backend..."
npm run build

# Frontend setup
echo "🎨 Setting up Frontend..."
cd frontend
npm install
echo "🏗️ Building Frontend..."
npm run build
cd ..

# Restart services
echo "🔄 Restarting Systemd Services..."
sudo systemctl restart $BACKEND_SERVICE
sudo systemctl restart $FRONTEND_SERVICE

echo "------------------------------------------------"
echo "✅ Deployment Completed Successfully!"
echo "------------------------------------------------"
