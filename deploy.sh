#!/bin/bash
set -e

echo "=== Reviewer Deployment ==="

# 1. Pull latest code
echo "Pulling latest code..."
git pull origin main

# 2. Install dependencies
echo "Installing dependencies..."
npm ci

# 3. Create reviewer schema (if not exists)
echo "Creating reviewer schema..."
docker exec hummingbot-postgres psql -U hbot -d seeder -c 'CREATE SCHEMA IF NOT EXISTS reviewer;'

# 4. Push Prisma schema
echo "Pushing Prisma schema..."
npx prisma db push

# 5. Build
echo "Building..."
npm run build

# 6. Restart services
echo "Restarting services..."
pm2 reload reviewer-web
pm2 reload reviewer-worker

echo "=== Deployment Complete ==="