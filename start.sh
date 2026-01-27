#!/bin/bash
set -e

echo "=== Starting Reviewer ==="

# Start services
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

echo "=== Reviewer Started ==="