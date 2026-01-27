#!/bin/bash
set -e

echo "=== Restarting Reviewer ==="

# Restart services
pm2 restart reviewer-web
pm2 restart reviewer-worker

echo "=== Reviewer Restarted ==="