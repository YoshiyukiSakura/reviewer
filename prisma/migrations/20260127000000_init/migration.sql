-- CreateEnum
CREATE TYPE "public"."ExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'PAUSED');

-- CreateEnum
CREATE TYPE "public"."GitOperationStatus" AS ENUM ('NOT_STARTED', 'BRANCH_CREATED', 'COMMITTED', 'PUSHED', 'PR_CREATED');

-- CreateEnum
CREATE TYPE "public"."IssueExecutionStatus" AS ENUM ('PENDING', 'WAITING_DEPS', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "public"."LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."LogSource" AS ENUM ('SYSTEM', 'CLAUDE', 'GIT', 'FRONTEND', 'API');

-- CreateEnum
CREATE TYPE "public"."MergeStatus" AS ENUM ('NOT_MERGED', 'MERGING', 'MERGED', 'AUTO_RESOLVED', 'CONFLICT');

-- CreateEnum
CREATE TYPE "public"."PRStatus" AS ENUM ('OPEN', 'APPROVED', 'CHANGES_REQ', 'MERGED', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."PlanStatus" AS ENUM ('DRAFT', 'REVIEWING', 'PUBLISHED', 'ARCHIVED');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."ReviewStatus_new" AS ENUM ('PENDING', 'REVIEWING', 'COMPLETED', 'FAILED', 'APPROVED', 'DISMISSED');
ALTER TABLE "Review" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Review" ALTER COLUMN "status" TYPE "public"."ReviewStatus_new" USING ("status"::text::"public"."ReviewStatus_new");
ALTER TYPE "public"."ReviewStatus" RENAME TO "ReviewStatus_old";
ALTER TYPE "public"."ReviewStatus_new" RENAME TO "ReviewStatus";
DROP TYPE "ReviewStatus_old";
ALTER TABLE "public"."Review" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."CommentSeverity_new" AS ENUM ('CRITICAL', 'MAJOR', 'MINOR', 'SUGGESTION', 'PRAISE');
ALTER TABLE "public"."ReviewComment" ALTER COLUMN "severity" TYPE "public"."CommentSeverity_new" USING ("severity"::text::"public"."CommentSeverity_new");
ALTER TYPE "public"."CommentSeverity" RENAME TO "CommentSeverity_old";
ALTER TYPE "public"."CommentSeverity_new" RENAME TO "CommentSeverity";
DROP TYPE "CommentSeverity_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."ReviewComment" DROP CONSTRAINT "ReviewComment_parentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."NotificationSettings" DROP CONSTRAINT "NotificationSettings_userId_fkey";

-- DropIndex
DROP INDEX "public"."Review_authorId_idx";

-- DropIndex
DROP INDEX "public"."Review_createdAt_idx";

-- DropIndex
DROP INDEX "public"."ReviewComment_authorId_idx";

-- DropIndex
DROP INDEX "public"."ReviewComment_parentId_idx";

-- DropIndex
DROP INDEX "public"."ReviewComment_filePath_idx";

-- DropIndex
DROP INDEX "public"."User_email_key";

-- DropIndex
DROP INDEX "public"."User_email_idx";

-- AlterTable
ALTER TABLE "public"."Review" DROP COLUMN "authorId",
DROP COLUMN "authorName",
DROP COLUMN "description",
DROP COLUMN "sourceId",
DROP COLUMN "sourceType",
DROP COLUMN "sourceUrl",
DROP COLUMN "title",
ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "aiTokensUsed" INTEGER,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "branchName" TEXT NOT NULL,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "dismissReason" TEXT,
ADD COLUMN     "dismissedAt" TIMESTAMP(3),
ADD COLUMN     "error" TEXT,
ADD COLUMN     "executionId" TEXT NOT NULL,
ADD COLUMN     "prNumber" INTEGER NOT NULL,
ADD COLUMN     "prUrl" TEXT NOT NULL,
ADD COLUMN     "reasoning" TEXT,
ADD COLUMN     "score" INTEGER,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "summary" TEXT;

-- AlterTable
ALTER TABLE "public"."ReviewComment" DROP COLUMN "authorId",
DROP COLUMN "authorName",
DROP COLUMN "isResolved",
DROP COLUMN "lineEnd",
DROP COLUMN "lineStart",
DROP COLUMN "parentId",
DROP COLUMN "updatedAt",
ADD COLUMN     "category" TEXT,
ADD COLUMN     "lineNumber" INTEGER,
ADD COLUMN     "suggestion" TEXT,
ALTER COLUMN "filePath" SET NOT NULL,
ALTER COLUMN "severity" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "bio",
DROP COLUMN "name",
DROP COLUMN "password",
ADD COLUMN     "slackTeamId" TEXT,
ADD COLUMN     "slackUsername" TEXT NOT NULL,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "slackUserId" SET NOT NULL;

-- DropTable
DROP TABLE "public"."NotificationSettings";

-- DropTable
DROP TABLE "public"."TestReport";

-- DropEnum
DROP TYPE "public"."RecommendationType";

-- CreateTable
CREATE TABLE "public"."Conversation" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Execution" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "public"."ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "config" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "branchName" TEXT,
    "gitStatus" "public"."GitOperationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "prNumber" INTEGER,
    "prUrl" TEXT,
    "prStatus" "public"."PRStatus",
    "prStatusSyncedAt" TIMESTAMP(3),
    "saturationGroupId" TEXT,
    "pauseReason" TEXT,
    "pausedAt" TIMESTAMP(3),
    "parallelMode" BOOLEAN NOT NULL DEFAULT true,
    "maxParallelIssues" INTEGER NOT NULL DEFAULT 3,
    "maxWorktreesPerIssue" INTEGER NOT NULL DEFAULT 1,
    "hasConflicts" BOOLEAN NOT NULL DEFAULT false,
    "conflictedIssueIds" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Execution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExecutionLog" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "issueExecutionId" TEXT,
    "level" "public"."LogLevel" NOT NULL DEFAULT 'INFO',
    "source" "public"."LogSource" NOT NULL DEFAULT 'SYSTEM',
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GitHubToken" (
    "id" TEXT NOT NULL,
    "sshHost" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitHubToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IssueExecution" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "taskTitle" TEXT NOT NULL,
    "taskDescription" TEXT NOT NULL,
    "status" "public"."IssueExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "claudeSessionId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "handoff" JSONB,
    "mergeStatus" "public"."MergeStatus" NOT NULL DEFAULT 'NOT_MERGED',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "claimedBy" TEXT,
    "claimLeaseAt" TIMESTAMP(3),
    "blockedByIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "level" INTEGER NOT NULL DEFAULT 0,
    "worktreePath" TEXT,
    "issueBranchName" TEXT,

    CONSTRAINT "IssueExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LoginToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "slackUserId" TEXT NOT NULL,
    "slackUsername" TEXT NOT NULL,
    "slackTeamId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MasterPlan" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Plan" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "sessionId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pendingQuestion" JSONB,
    "summary" TEXT,
    "blockedByPlanIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "masterPlanId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "creatorId" TEXT,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "gitUrl" TEXT,
    "gitBranch" TEXT DEFAULT 'main',
    "localPath" TEXT,
    "techStack" TEXT[],
    "conventions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProjectLock" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Task" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "labels" TEXT[],
    "acceptanceCriteria" TEXT[],
    "relatedFiles" TEXT[],
    "estimateHours" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "dependsOnId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "blockedByIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "positionX" DOUBLE PRECISION,
    "positionY" DOUBLE PRECISION,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorktreeLock" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "worktreePath" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorktreeLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conversation_planId_idx" ON "public"."Conversation"("planId" ASC);

-- CreateIndex
CREATE INDEX "Conversation_userId_idx" ON "public"."Conversation"("userId" ASC);

-- CreateIndex
CREATE INDEX "Execution_createdAt_idx" ON "public"."Execution"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Execution_parallelMode_idx" ON "public"."Execution"("parallelMode" ASC);

-- CreateIndex
CREATE INDEX "Execution_planId_idx" ON "public"."Execution"("planId" ASC);

-- CreateIndex
CREATE INDEX "Execution_prStatus_idx" ON "public"."Execution"("prStatus" ASC);

-- CreateIndex
CREATE INDEX "Execution_saturationGroupId_idx" ON "public"."Execution"("saturationGroupId" ASC);

-- CreateIndex
CREATE INDEX "Execution_status_idx" ON "public"."Execution"("status" ASC);

-- CreateIndex
CREATE INDEX "ExecutionLog_executionId_idx" ON "public"."ExecutionLog"("executionId" ASC);

-- CreateIndex
CREATE INDEX "ExecutionLog_issueExecutionId_idx" ON "public"."ExecutionLog"("issueExecutionId" ASC);

-- CreateIndex
CREATE INDEX "ExecutionLog_level_idx" ON "public"."ExecutionLog"("level" ASC);

-- CreateIndex
CREATE INDEX "ExecutionLog_source_idx" ON "public"."ExecutionLog"("source" ASC);

-- CreateIndex
CREATE INDEX "ExecutionLog_timestamp_idx" ON "public"."ExecutionLog"("timestamp" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "GitHubToken_sshHost_key" ON "public"."GitHubToken"("sshHost" ASC);

-- CreateIndex
CREATE INDEX "IssueExecution_claimedBy_idx" ON "public"."IssueExecution"("claimedBy" ASC);

-- CreateIndex
CREATE INDEX "IssueExecution_executionId_idx" ON "public"."IssueExecution"("executionId" ASC);

-- CreateIndex
CREATE INDEX "IssueExecution_level_idx" ON "public"."IssueExecution"("level" ASC);

-- CreateIndex
CREATE INDEX "IssueExecution_mergeStatus_idx" ON "public"."IssueExecution"("mergeStatus" ASC);

-- CreateIndex
CREATE INDEX "IssueExecution_status_idx" ON "public"."IssueExecution"("status" ASC);

-- CreateIndex
CREATE INDEX "IssueExecution_taskId_idx" ON "public"."IssueExecution"("taskId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "LoginToken_token_key" ON "public"."LoginToken"("token" ASC);

-- CreateIndex
CREATE INDEX "MasterPlan_projectId_idx" ON "public"."MasterPlan"("projectId" ASC);

-- CreateIndex
CREATE INDEX "Plan_creatorId_idx" ON "public"."Plan"("creatorId" ASC);

-- CreateIndex
CREATE INDEX "Plan_masterPlanId_idx" ON "public"."Plan"("masterPlanId" ASC);

-- CreateIndex
CREATE INDEX "Plan_projectId_idx" ON "public"."Plan"("projectId" ASC);

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "public"."Project"("userId" ASC);

-- CreateIndex
CREATE INDEX "ProjectLock_expiresAt_idx" ON "public"."ProjectLock"("expiresAt" ASC);

-- CreateIndex
CREATE INDEX "ProjectLock_projectId_idx" ON "public"."ProjectLock"("projectId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectLock_projectId_key" ON "public"."ProjectLock"("projectId" ASC);

-- CreateIndex
CREATE INDEX "Task_planId_idx" ON "public"."Task"("planId" ASC);

-- CreateIndex
CREATE INDEX "WorktreeLock_executionId_idx" ON "public"."WorktreeLock"("executionId" ASC);

-- CreateIndex
CREATE INDEX "WorktreeLock_expiresAt_idx" ON "public"."WorktreeLock"("expiresAt" ASC);

-- CreateIndex
CREATE INDEX "WorktreeLock_projectId_idx" ON "public"."WorktreeLock"("projectId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "WorktreeLock_worktreePath_key" ON "public"."WorktreeLock"("worktreePath" ASC);

-- CreateIndex
CREATE INDEX "Review_executionId_idx" ON "public"."Review"("executionId" ASC);

-- CreateIndex
CREATE INDEX "Review_score_idx" ON "public"."Review"("score" ASC);

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Execution" ADD CONSTRAINT "Execution_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExecutionLog" ADD CONSTRAINT "ExecutionLog_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "public"."Execution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExecutionLog" ADD CONSTRAINT "ExecutionLog_issueExecutionId_fkey" FOREIGN KEY ("issueExecutionId") REFERENCES "public"."IssueExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IssueExecution" ADD CONSTRAINT "IssueExecution_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "public"."Execution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IssueExecution" ADD CONSTRAINT "IssueExecution_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MasterPlan" ADD CONSTRAINT "MasterPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Plan" ADD CONSTRAINT "Plan_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Plan" ADD CONSTRAINT "Plan_masterPlanId_fkey" FOREIGN KEY ("masterPlanId") REFERENCES "public"."MasterPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Plan" ADD CONSTRAINT "Plan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProjectLock" ADD CONSTRAINT "ProjectLock_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "public"."Execution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "public"."Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
