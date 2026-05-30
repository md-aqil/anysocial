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

# Pull latest code (reset --hard to overwrite modified tracked files,
# clean -fd to remove any now-ignored untracked dirs like .next, Gemini, scratch)
echo "📥 Pulling latest code from main..."
git fetch origin
git reset --hard origin/main
git clean -fd --force

# Backend setup
echo "📦 Setting up Backend..."
if ! command -v ffmpeg &> /dev/null
then
    echo "🎥 FFmpeg not found, installing..."
    sudo apt-get update && sudo apt-get install -y ffmpeg
fi
npm install

# Run database migrations
echo "🗄️ Running Prisma migrations..."
if [ -f "/etc/socialsched/.env" ]; then
    export $(grep -v '^#' /etc/socialsched/.env | xargs)
    # Push database schema directly (since there are no migration files)
    npx prisma db push --accept-data-loss
else
    echo "Warning: /etc/socialsched/.env not found, using existing environment for migration"
    # Push database schema directly
    npx prisma db push --accept-data-loss
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
