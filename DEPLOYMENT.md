# Deployment Guide

This document provides comprehensive deployment instructions for the Code Reviewer application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Docker Deployment](#docker-deployment)
- [PM2 Deployment](#pm2-deployment)
- [Production Checklist](#production-checklist)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Ensure the following software is installed on your deployment target:

| Software | Minimum Version | Recommended Version |
|----------|-----------------|---------------------|
| Node.js | 18.x | 20.x LTS |
| npm | 9.x | 10.x |
| PostgreSQL | 14.x | 15.x or 16.x |
| PM2 | 5.x | Latest |
| Docker | 24.x | Latest (optional) |

### Verify Installation

```bash
node --version    # Should show v18.x or higher
npm --version     # Should show 9.x or higher
psql --version    # Should show 14.x or higher
pm2 --version     # Should show 5.x or higher
docker --version  # Optional, for Docker deployments
```

---

## Environment Configuration

### 1. Copy Environment Template

```bash
cp .env.example .env
```

### 2. Configure Environment Variables

Edit the `.env` file with your production values:

```bash
# Application Settings
NODE_ENV=production
APP_URL=https://your-domain.com
APP_PORT=3000

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/reviewer_db

# Authentication / JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d

# GitHub Integration
GITHUB_CLIENT_ID=your-github-oauth-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-client-secret
GITHUB_TOKEN=your-github-personal-access-token
```

### 3. Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Set to `production` for production deployments |
| `APP_URL` | Yes | Public URL of your application |
| `APP_PORT` | No | Port for Next.js server (default: 3000) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Strong random string for JWT signing |
| `JWT_EXPIRES_IN` | No | JWT token expiration (default: 7d) |
| `GITHUB_CLIENT_ID` | Yes* | GitHub OAuth app client ID (*required for GitHub login) |
| `GITHUB_CLIENT_SECRET` | Yes* | GitHub OAuth app client secret |
| `GITHUB_TOKEN` | Yes* | GitHub PAT for API access (*required for PR monitoring) |

---

## Database Setup

### Option 1: Local PostgreSQL Installation

1. **Install PostgreSQL**

   ```bash
   # macOS with Homebrew
   brew install postgresql@15
   brew services start postgresql@15

   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. **Create Database and User**

   ```bash
   sudo -u postgres psql

   -- In PostgreSQL prompt:
   CREATE DATABASE reviewer_db;
   CREATE USER reviewer_user WITH ENCRYPTED PASSWORD 'your-secure-password';
   GRANT ALL PRIVILEGES ON DATABASE reviewer_db TO reviewer_user;
   \c reviewer_db
   GRANT ALL ON SCHEMA public TO reviewer_user;
   ALTER DATABASE reviewer_db OWNER TO reviewer_user;
   \q
   ```

3. **Run Database Migrations**

   ```bash
   npx prisma migrate deploy
   ```

4. **Generate Prisma Client**

   ```bash
   npx prisma generate
   ```

### Option 2: Docker PostgreSQL

```bash
# Run PostgreSQL in Docker
docker run -d \
  --name reviewer-postgres \
  -e POSTGRES_DB=reviewer_db \
  -e POSTGRES_USER=reviewer_user \
  -e POSTGRES_PASSWORD=your-secure-password \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15

# Wait for PostgreSQL to be ready, then run migrations
sleep 5
docker exec -it reviewer-postgres npx prisma migrate deploy
```

### Option 3: Cloud Database (AWS RDS, Supabase, etc.)

1. Create a PostgreSQL database on your preferred cloud provider
2. Update `DATABASE_URL` in `.env` with the connection string:

   ```bash
   DATABASE_URL=postgresql://user:password@host:5432/database?schema=public
   ```

3. Run migrations:

   ```bash
   npx prisma migrate deploy
   ```

---

## Docker Deployment

### 1. Create Dockerfile

Create a `Dockerfile` in the project root:

```dockerfile
# Use Node.js LTS image
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the Next.js application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema and generated client
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### 2. Update next.config.ts for Standalone Output

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  basePath: '/reviewer',
  output: 'standalone',
}

export default nextConfig
```

### 3. Create .dockerignore

```
node_modules
.next
.git
.env
.env.local
.env.*.local
*.log
npm-debug.log*
.DS_Store
coverage
.vercel
```

### 4. Build and Run Docker Image

```bash
# Build the Docker image
docker build -t reviewer-app .

# Run the container
docker run -d \
  --name reviewer \
  -p 3000:3000 \
  --env-file .env \
  reviewer-app
```

### 5. Docker Compose (Recommended)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=reviewer_db
      - POSTGRES_USER=reviewer_user
      - POSTGRES_PASSWORD=your-secure-password
    ports:
      - "5432:5432"
    restart: unless-stopped

  # Optional: PM2 for process management
  pm2:
    image: keymetrics/pm2:latest-alpine
    volumes:
      - .:/app
      - pm2_data:/app/.pm2
    env_file:
      - .env
    working_dir: /app
    command: pm2-runtime ecosystem.config.js
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:
  pm2_data:
```

Deploy with Docker Compose:

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

---

## PM2 Deployment

### 1. Install PM2 Globally

```bash
npm install -g pm2
```

### 2. Configure Ecosystem File

The project includes `ecosystem.config.js` with two processes:

```javascript
module.exports = {
  apps: [
    {
      name: 'reviewer-web',
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'reviewer-worker',
      script: 'npm',
      args: 'run worker',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

### 3. Update package.json with Worker Script

Add the worker script to `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "worker": "node src/worker/index.js",
    "lint": "eslint",
    "test": "jest"
  }
}
```

### 4. Start Application with PM2

```bash
# Start in production mode
pm2 start ecosystem.config.js --env production

# Start with specific options
pm2 start ecosystem.config.js --env production --name reviewer-app

# View logs
pm2 logs

# Monitor processes
pm2 monit

# Check status
pm2 status
```

### 5. PM2 Management Commands

```bash
# Restart all processes
pm2 restart all

# Restart specific process
pm2 restart reviewer-web

# Stop all processes
pm2 stop all

# Delete process
pm2 delete reviewer-web

# Save current process list
pm2 save

# Setup PM2 startup script
pm2 startup

# Reload (zero-downtime)
pm2 reload all

# View detailed logs
pm2 logs --nostream --lines 100
```

### 6. PM2 Cluster Mode (Multi-core)

For better performance on multi-core servers:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'reviewer-web',
      script: 'npm',
      args: 'start',
      instances: 'max',  // Use all available CPU cores
      exec_mode: 'cluster',
      // ... other options
    }
  ]
};
```

---

## Production Checklist

Before going live, verify the following:

### Security

- [ ] `NODE_ENV=production` is set
- [ ] Strong `JWT_SECRET` (32+ random characters)
- [ ] GitHub credentials are secure
- [ ] Database connection uses SSL in production
- [ ] Firewall blocks non-essential ports

### Performance

- [ ] Build completed successfully: `npm run build`
- [ ] Database migrations applied: `npx prisma migrate deploy`
- [ ] Prisma client generated: `npx prisma generate`
- [ ] Static assets cached properly
- [ ] Memory limits configured in PM2

### Monitoring

- [ ] PM2 logs configured for rotation:

  ```bash
  pm2 install pm2-logrotate
  pm2 set pm2-logrotate:max_size 50M
  pm2 set pm2-logrotate:retain 30
  ```

- [ ] Health check endpoint configured
- [ ] Error monitoring set up (Sentry, etc.)

### Backup

- [ ] Database backup schedule configured
- [ ] Backup restoration tested
- [ ] Environment files backed up securely

---

## Troubleshooting

### Database Connection Issues

**Error**: `ECONNREFUSED` or `connection refused`

**Solutions**:
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql   # Linux
brew services list | grep postgresql  # macOS

# Verify connection string format
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Test connection
npx prisma db push
```

### Prisma Client Not Generated

**Error**: `Unknown command 'prisma'` or `PrismaClient not found`

**Solutions**:
```bash
# Regenerate Prisma client
npx prisma generate

# If using Docker, ensure COPY includes prisma directory
```

### JWT Authentication Failures

**Error**: `401 Unauthorized` or `jwt malformed`

**Solutions**:
```bash
# Verify JWT_SECRET is set and consistent
echo $JWT_SECRET

# Ensure same secret used across all server instances
# Regenerate tokens if secret was changed
```

### Next.js Build Failures

**Error**: Build fails with TypeScript or lint errors

**Solutions**:
```bash
# Run build with verbose output
npm run build

# Fix linting issues
npm run lint

# Type check
npx tsc --noEmit
```

### PM2 Process Crashes

**Error**: Process restarts repeatedly or shows `errored` status

**Solutions**:
```bash
# View detailed error logs
pm2 logs --nostream --lines 200

# Check process memory
pm2 monit

# Restart with more verbose logging
pm2 restart reviewer-web --update-env
```

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3000`

**Solutions**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm start
```

### GitHub API Rate Limiting

**Error**: GitHub API returns 403 or 429 status

**Solutions**:
```bash
# Check current rate limit
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/rate_limit

# Use authenticated requests (add token to requests)
# Implement exponential backoff
# Consider using GitHub Apps for higher limits
```

### Memory Issues

**Error**: Process killed due to OOM (Out of Memory)

**Solutions**:
```bash
# Increase memory limit in ecosystem.config.js
max_memory_restart: '2G'

# Monitor memory usage
pm2 monit

# Add swap space (Linux)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Log Management

**Solutions**:
```bash
# Configure log rotation
pm2 install pm2-logrotate

# Set log options
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:max_number 10
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss

# Clear all logs
pm2 flush
```

### Rollback Procedure

If deployment causes issues:

```bash
# List previous deployments
pm2 list

# Restore previous version
pm2 rollback reviewer-web [version]

# Or deploy previous commit
git checkout <previous-commit>
npm run build
pm2 restart reviewer-web
```

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)