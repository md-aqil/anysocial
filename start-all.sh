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
pkill -f "cloudflared tunnel --config .cloudflared/config.yaml" 2>/dev/null
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

echo "🌉 Starting Cloudflare Tunnel..."
/opt/homebrew/bin/cloudflared tunnel --config .cloudflared/config.yaml run > .cloudflared/tunnel.log 2>&1 &
sleep 2

echo "📦 Starting Backend (Port 3001)..."
npm run dev > .backend.log 2>&1 &
sleep 3

echo "🎨 Starting Frontend (Port 3000)..."
echo "Done! Opening the dashboard..."
cd frontend && npm run dev

# Keep script running
wait
