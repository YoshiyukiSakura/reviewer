#!/bin/bash
set -e

echo "=== Stopping Reviewer ==="

# Stop services
pm2 stop reviewer-web reviewer-worker

echo "=== Reviewer Stopped ==="