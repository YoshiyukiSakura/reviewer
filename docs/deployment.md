# Deployment Documentation

This guide covers deploying the AI Code Reviewer application to various platforms.

## Prerequisites

- Node.js 18.x or later
- PostgreSQL database
- npm, yarn, pnpm, or bun

## Environment Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd reviewer

# Install dependencies
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

#### Required Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/reviewer_db

# JWT Authentication
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRES_IN=7d

# Application
NODE_ENV=production
APP_URL=https://your-domain.com
```

#### Optional Variables

```env
# GitHub Integration (if using GitHub features)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_TOKEN=your-github-personal-access-token

# Email Notifications
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-email-password

# Logging
LOG_LEVEL=info
```

### 3. Database Setup

Run database migrations:

```bash
npx prisma migrate deploy
```

Generate Prisma client:

```bash
npx prisma generate
```

### 4. Build the Application

```bash
npm run build
```

---

## Deployment Options

### Option 1: Vercel (Recommended)

[Vercel](https://vercel.com) is the recommended platform for Next.js applications.

#### Step 1: Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository

#### Step 2: Configure Project

1. **Framework Preset**: Next.js (automatic)
2. **Build Command**: `npm run build`
3. **Output Directory**: `.next`
4. **Install Command**: `npm install`

#### Step 3: Environment Variables

Add all environment variables in the Vercel dashboard:
- Go to Project Settings > Environment Variables
- Add each variable from your `.env` file
- Select appropriate environments (Production, Development, Preview)

#### Step 4: Database

Vercel recommends using [Vercel Postgres](https://vercel.com/postgres) or [Neon](https://neon.tech):

```bash
# Example: Connect to Vercel Postgres
DATABASE_URL=postgres://user:password@ep-xxx.region.vercel-storage.com/reviewer_db
```

#### Step 5: Deploy

Automatic deployments are configured. Push to main to trigger deployment.

---

### Option 2: Docker

Deploy using Docker containers.

#### 1. Create Dockerfile

```dockerfile
# Use official Next.js image
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

#### 2. Create .dockerignore

```
node_modules
.next
.git
.env.local
.env*.local
*.log
npm-debug.log*
.DS_Store
```

#### 3. Build and Run

```bash
# Build the image
docker build -t ai-code-reviewer .

# Run the container
docker run -p 3000:3000 \
  --env-file .env \
  ai-code-reviewer
```

#### 4. Docker Compose (with PostgreSQL)

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/reviewer
      - NODE_ENV=production
    depends_on:
      - db
    env_file:
      - .env

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: reviewer
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

Start with:
```bash
docker-compose up -d
```

---

### Option 3: Traditional Server (Node.js)

Deploy to a Linux server with Node.js.

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install PM2 for process management
sudo npm install -g pm2
```

#### 2. Configure Database

```bash
# Create database and user
sudo -u postgres psql
```

```sql
CREATE DATABASE reviewer;
CREATE USER reviewer_user WITH ENCRYPTED PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE reviewer TO reviewer_user;
\q
```

#### 3. Deploy Application

```bash
# Clone and setup
git clone <repository-url>
cd reviewer
npm ci

# Configure environment
cp .env.example .env
nano .env  # Edit with your values

# Build
npm run build

# Start with PM2
pm2 start npm --name "ai-reviewer" -- run start

# Setup startup
pm2 startup
pm2 save
```

#### 4. Configure Nginx (Reverse Proxy)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable and restart Nginx
sudo ln -s /etc/nginx/sites-available/reviewer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 5. Setup SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

---

### Option 4: Railway

[Railway](https://railway.app) provides easy deployment with PostgreSQL.

#### Step 1: Create Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo"

#### Step 2: Add PostgreSQL

1. In your project, click "New Database"
2. Select "PostgreSQL"
3. Note the connection URL

#### Step 3: Configure Environment

1. Go to "Variables" tab
2. Add environment variables:
   - `DATABASE_URL`: From PostgreSQL service
   - `JWT_SECRET`: Generate a secure random string
   - `NODE_ENV`: `production`

#### Step 4: Deploy

Railway will automatically build and deploy from your GitHub repository.

---

## Post-Deployment Checklist

- [ ] Environment variables are set correctly
- [ ] Database migrations have run
- [ ] Application builds successfully
- [ ] SSL certificate is installed (production)
- [ ] Logs are being monitored
- [ ] Backups are configured
- [ ] Health check endpoint is working

---

## Health Check

The application exposes a health check endpoint at `/api/health`:

```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

---

## Monitoring

### PM2 (for traditional servers)

```bash
# View logs
pm2 logs ai-reviewer

# Monitor metrics
pm2 monit

# Restart
pm2 restart ai-reviewer

# View status
pm2 status
```

### Application Logs

Logs are written to stdout in production. Use a log aggregation service:

- **Vercel**: Logs available in dashboard
- **Docker**: `docker logs <container>`
- **Railway**: Logs available in dashboard

---

## Database Backup

### Manual Backup

```bash
pg_dump -h localhost -U reviewer_user reviewer > backup_$(date +%Y%m%d).sql
```

### Automated Backups (Cron)

```bash
# Edit crontab
crontab -e

# Add backup job (daily at 2 AM)
0 2 * * * pg_dump -h localhost -U reviewer_user reviewer | gzip > /backups/reviewer_$(date +\%Y\%m\%d).sql.gz
```

---

## Troubleshooting

### Build Failures

```bash
# Clear Next.js cache
npm run clean

# Rebuild
npm run build
```

### Database Connection Issues

1. Verify `DATABASE_URL` is correct
2. Check database is running
3. Ensure firewall allows connection

```bash
# Test database connection
npx prisma db push
```

### Out of Memory

Increase Node.js memory limit:

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

---

## Performance Optimization

### 1. Enable Caching

Next.js automatically caches static assets. Configure ISR for dynamic pages:

```tsx
export const revalidate = 60 // Revalidate every 60 seconds
```

### 2. Database Indexes

Ensure indexes exist for frequently queried fields:

```prisma
model Review {
  // ...

  @@index([authorId])
  @@index([status])
  @@index([createdAt])
}
```

### 3. CDN (Vercel Edge Network)

Vercel automatically serves assets from CDN. For other platforms, configure:

```nginx
location /_next/static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## Security Checklist

- [ ] `NODE_ENV` set to `production`
- [ ] Strong `JWT_SECRET` (32+ random characters)
- [ ] Database credentials are strong
- [ ] HTTPS enabled
- [ ] Environment variables not exposed to client
- [ ] Dependencies updated regularly
- [ ] Database connection uses SSL in production

---

## Rollback Procedure

### Vercel

1. Go to Deployments in Vercel dashboard
2. Find previous working deployment
3. Click "Promote to Production"

### Docker

```bash
# List images
docker images

# Rollback to previous image
docker run -d --name app-prev -p 3000:3000 previous-image-id
```

### Traditional Server

```bash
# Checkout previous version
git checkout previous-commit
npm ci
npm run build
pm2 restart ai-reviewer
```