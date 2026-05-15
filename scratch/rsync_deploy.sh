#!/bin/bash
set -e

VPS="aqil@187.127.154.55"
PROJECT_DIR="/Users/mdaqil/Documents/socialsched.vibeship.in"
VPS_APP_DIR="/var/www/socialsched"

echo "Syncing files to VPS..."
rsync -avz --exclude 'node_modules' \
           --exclude '.next' \
           --exclude 'dist' \
           --exclude '.git' \
           --exclude '.env' \
           --exclude 'tunnel-config' \
           -e "ssh -o StrictHostKeyChecking=no" \
           "$PROJECT_DIR/" \
           "$VPS:/tmp/socialsched_code"

echo "Files synced to /tmp/socialsched_code"
