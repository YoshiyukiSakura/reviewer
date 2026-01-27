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

# 4. Create tables with proper column names (quoted to preserve case)
echo "Creating tables..."
docker exec hummingbot-postgres psql -U hbot -d seeder << 'EOF'
-- Drop existing tables
DROP TABLE IF EXISTS reviewer.reviewer_reviewcomment CASCADE;
DROP TABLE IF EXISTS reviewer.reviewer_notificationsettings CASCADE;
DROP TABLE IF EXISTS reviewer.reviewer_testreport CASCADE;
DROP TABLE IF EXISTS reviewer.reviewer_user CASCADE;
DROP TABLE IF EXISTS reviewer.reviewer_review CASCADE;

-- Create Review table
CREATE TABLE reviewer.reviewer_review (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'PENDING',
    "sourceType" TEXT,
    "sourceId" TEXT,
    "sourceUrl" TEXT,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3)
);

-- Create ReviewComment table
CREATE TABLE reviewer.reviewer_reviewcomment (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    "filePath" TEXT,
    "lineStart" INTEGER,
    "lineEnd" INTEGER,
    "isResolved" BOOLEAN DEFAULT false,
    severity TEXT,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT,
    parentId TEXT,
    "reviewId" TEXT NOT NULL REFERENCES reviewer.reviewer_review(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3)
);

-- Create User table
CREATE TABLE reviewer.reviewer_user (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    password TEXT,
    "avatarUrl" TEXT,
    "slackUserId" TEXT UNIQUE,
    "createdAt" TIMESTAMP(3) DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3)
);

-- Create NotificationSettings table
CREATE TABLE reviewer.reviewer_notificationsettings (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE REFERENCES reviewer.reviewer_user(id) ON DELETE CASCADE,
    "emailNotifications" BOOLEAN DEFAULT true,
    "pushNotifications" BOOLEAN DEFAULT true,
    "reviewAssignments" BOOLEAN DEFAULT true,
    "reviewComments" BOOLEAN DEFAULT true,
    "reviewStatusChanges" BOOLEAN DEFAULT true,
    "weeklyDigest" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3)
);

-- Create TestReport table
CREATE TABLE reviewer.reviewer_testreport (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    "executionId" TEXT,
    recommendation TEXT NOT NULL,
    "recommendationReason" TEXT,
    "totalTasks" INTEGER DEFAULT 0,
    "completedTasks" INTEGER DEFAULT 0,
    "failedTasks" INTEGER DEFAULT 0,
    "skippedTasks" INTEGER DEFAULT 0,
    "repositoryName" TEXT,
    "repositoryUrl" TEXT,
    "branchName" TEXT,
    "commitSha" TEXT,
    "pullRequestId" TEXT,
    "pullRequestUrl" TEXT,
    summary TEXT,
    "overallAnalysis" TEXT,
    "keyFindings" TEXT[],
    concerns TEXT[],
    positives TEXT[],
    suggestions TEXT[],
    score FLOAT,
    "maxScore" FLOAT,
    "acceptanceSuggestion" TEXT,
    "testDuration" INTEGER,
    "testRunner" TEXT,
    "authorId" TEXT,
    "authorName" TEXT,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reviewer_review_authorid ON reviewer.reviewer_review("authorId");
CREATE INDEX IF NOT EXISTS idx_reviewer_review_status ON reviewer.reviewer_review(status);
CREATE INDEX IF NOT EXISTS idx_reviewer_review_createdat ON reviewer.reviewer_review("createdAt");
CREATE INDEX IF NOT EXISTS idx_reviewer_reviewcomment_reviewid ON reviewer.reviewer_reviewcomment("reviewId");
CREATE INDEX IF NOT EXISTS idx_reviewer_reviewcomment_authorid ON reviewer.reviewer_reviewcomment("authorId");
CREATE INDEX IF NOT EXISTS idx_reviewer_reviewcomment_parentid ON reviewer.reviewer_reviewcomment(parentId);
CREATE INDEX IF NOT EXISTS idx_reviewer_reviewcomment_filepath ON reviewer.reviewer_reviewcomment("filePath");
CREATE INDEX IF NOT EXISTS idx_reviewer_user_email ON reviewer.reviewer_user(email);
CREATE INDEX IF NOT EXISTS idx_reviewer_notificationsettings_userid ON reviewer.reviewer_notificationsettings("userId");
CREATE INDEX IF NOT EXISTS idx_reviewer_testreport_authorid ON reviewer.reviewer_testreport("authorId");
CREATE INDEX IF NOT EXISTS idx_reviewer_testreport_recommendation ON reviewer.reviewer_testreport(recommendation);
CREATE INDEX IF NOT EXISTS idx_reviewer_testreport_executedat ON reviewer.reviewer_testreport("executedAt");
CREATE INDEX IF NOT EXISTS idx_reviewer_testreport_executionid ON reviewer.reviewer_testreport("executionId");
EOF

# 5. Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# 6. Build
echo "Building..."
npm run build

# 7. Restart services
echo "Restarting services..."
pm2 reload reviewer-web
pm2 reload reviewer-worker

echo "=== Deployment Complete ==="