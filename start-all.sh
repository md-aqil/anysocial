#!/bin/bash

# Cloudflare Tunnel Status
# Hostname: https://lcsw.dpdns.org
# Routes: 
#   / (Frontend) -> Port 3000
#   /api, /oauth, /uploads (Backend) -> Port 3001

echo "------------------------------------------------"
echo "🚀 Starting Anyshare Unified Stack"
echo "------------------------------------------------"

# Kill existing processes to ensure a clean start
echo "🧹 Cleaning up old processes..."
pkill -f "cloudflared tunnel --config tunnel-config/config.yaml" 2>/dev/null
lsof -ti :3001 | xargs kill -9 2>/dev/null
lsof -ti :3000 | xargs kill -9 2>/dev/null

# trap ctrl-c and call cleanup
trap cleanup INT

function cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    pkill -P $$
    exit
}

# Start PostgreSQL if not running
echo "🐘 Checking PostgreSQL..."
if ! pg_isready -q -h localhost -p 5432; then
    echo "   Starting PostgreSQL..."
    # Try brew services first, fallback to manual start
    brew services start postgresql@18 2>/dev/null || true
    sleep 1
    # If still not running, try pg_ctl with common paths
    if ! pg_isready -q -h localhost -p 5432; then
        echo "   Starting PostgreSQL with pg_ctl..."
        pg_ctl start -D /usr/local/var/postgres 2>/dev/null || true
        sleep 1
        if ! pg_isready -q -h localhost -p 5432; then
            pg_ctl start -D /opt/homebrew/var/postgres 2>/dev/null || true
            sleep 1
        fi
        if ! pg_isready -q -h localhost -p 5432; then
            pg_ctl start -D /opt/homebrew/var/postgresql@18 2>/dev/null || true
            sleep 2
        fi
    fi
    # Final check
    if pg_isready -q -h localhost -p 5432; then
        echo "   PostgreSQL started successfully"
    else
        echo "   ⚠️  PostgreSQL could not be started. Please start it manually."
    fi
else
    echo "   PostgreSQL is already running"
fi

echo "🌉 Starting Cloudflare Tunnel..."
/opt/homebrew/bin/cloudflared tunnel --config tunnel-config/config.yaml run > tunnel-config/tunnel.log 2>&1 &
sleep 2

echo "📦 Starting Backend (Port 3001)..."
npm run dev > .backend.log 2>&1 &
sleep 3

echo "🎨 Starting Frontend (Port 3000)..."
echo "Done! Opening the dashboard..."
cd frontend && npm run dev > ../.frontend.log 2>&1 &

# Keep script running
wait
