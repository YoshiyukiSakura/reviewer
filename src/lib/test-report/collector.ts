/**
 * Test Report Data Collector
 *
 * Collects execution data, plan information, task status, conversation summary,
 * and PR diff for generating comprehensive test reports.
 */

import { prisma } from '../prisma';
import { log } from '../remote-log';
import { getPRDiff, GetPRDiffParams } from '../github/pr-diff';

// Import types generated from Prisma schema
import type { TestReport } from '@prisma/client';

/**
 * Represents execution data from the review system
 */
export interface ExecutionData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  sourceType: string | null;
  sourceId: string | null;
  sourceUrl: string | null;
  authorId: string;
  authorName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents plan information associated with an execution
 */
export interface PlanInfo {
  id: string;
  name: string;
  description: string | null;
  status: string;
  repositoryName: string | null;
  repositoryUrl: string | null;
  branchName: string | null;
  commitSha: string | null;
  pullRequestId: string | null;
  pullRequestUrl: string | null;
}

/**
 * Represents task/issue status within an execution
 */
export interface TaskStatus {
  taskId: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  assigneeId: string | null;
  assigneeName: string | null;
  completedAt: Date | null;
  failedAt: Date | null;
}

/**
 * Represents a conversation (comment thread) summary
 */
export interface ConversationSummary {
  totalComments: number;
  resolvedComments: number;
  unresolvedComments: number;
  comments: {
    id: string;
    content: string;
    authorName: string | null;
    createdAt: Date;
    isResolved: boolean;
    severity: string | null;
    filePath: string | null;
    lineStart: number | null;
  }[];
}

/**
 * PR diff information
 */
export interface PRDiffInfo {
  owner: string;
  repo: string;
  pullNumber: number;
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch: string | undefined;
  }>;
  totalAdditions: number;
  totalDeletions: number;
  totalChanges: number;
}

/**
 * Complete test report context
 */
export interface TestReportContext {
  execution: ExecutionData | null;
  plan: PlanInfo | null;
  tasks: TaskStatus[];
  conversation: ConversationSummary;
  prDiff: PRDiffInfo | null;
  collectedAt: Date;
}

/**
 * Success result for collection operations
 */
interface CollectSuccess<T> {
  success: true;
  data: T;
}

/**
 * Error result for collection operations
 */
interface CollectError {
  success: false;
  error: string;
}

/**
 * Result type for collection functions
 */
type CollectResult<T> = CollectSuccess<T> | CollectError;

/**
 * Parameters for collecting test report context
 */
export interface CollectTestReportContextParams {
  reviewId: string;
  prParams?: GetPRDiffParams;
}

/**
 * Collects execution data from a review
 */
async function collectExecutionData(reviewId: string): Promise<CollectResult<ExecutionData | null>> {
  try {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      log.warn('Review not found for execution data collection', { reviewId });
      return { success: true, data: null };
    }

    const executionData: ExecutionData = {
      id: review.id,
      title: review.title,
      description: review.description,
      status: review.status,
      sourceType: review.sourceType,
      sourceId: review.sourceId,
      sourceUrl: review.sourceUrl,
      authorId: review.authorId,
      authorName: review.authorName,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };

    log.debug('Execution data collected', { reviewId, status: review.status });
    return { success: true, data: executionData };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Failed to collect execution data', { reviewId, error: errorMessage });
    return { success: false, error: `Failed to collect execution data: ${errorMessage}` };
  }
}

/**
 * Collects plan information from execution data
 */
async function collectPlanInfo(execution: ExecutionData | null): Promise<CollectResult<PlanInfo | null>> {
  if (!execution) {
    return { success: true, data: null };
  }

  try {
    // Extract repo info from sourceUrl if available
    let repositoryName: string | null = null;
    let pullRequestId: string | null = null;

    if (execution.sourceUrl) {
      try {
        const url = new URL(execution.sourceUrl);
        const pathParts = url.pathname.split('/').filter(Boolean);
        if (pathParts.length >= 2) {
          repositoryName = `${pathParts[0]}/${pathParts[1]}`;
        }
        // Extract PR number from URL if it's a PR link
        const prMatch = url.pathname.match(/pull\/(\d+)/);
        if (prMatch) {
          pullRequestId = prMatch[1];
        }
      } catch {
        // Invalid URL, skip parsing
      }
    }

    const planInfo: PlanInfo = {
      id: execution.id,
      name: execution.title,
      description: execution.description,
      status: execution.status,
      repositoryName,
      repositoryUrl: execution.sourceUrl,
      branchName: null, // Would need additional API call to get branch
      commitSha: null, // Would need additional API call to get commit
      pullRequestId,
      pullRequestUrl: execution.sourceUrl,
    };

    log.debug('Plan info collected', { reviewId: execution.id });
    return { success: true, data: planInfo };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Failed to collect plan info', { reviewId: execution.id, error: errorMessage });
    return { success: false, error: `Failed to collect plan info: ${errorMessage}` };
  }
}

/**
 * Collects task status from review comments (using comments as task indicators)
 */
async function collectTaskStatus(reviewId: string): Promise<CollectResult<TaskStatus[]>> {
  try {
    const comments = await prisma.reviewComment.findMany({
      where: { reviewId },
      orderBy: { createdAt: 'asc' },
    });

    // Group comments by file/path to infer tasks
    const taskMap = new Map<string, TaskStatus>();

    for (const comment of comments) {
      const taskKey = comment.filePath || `comment-${comment.id}`;

      if (!taskMap.has(taskKey)) {
        taskMap.set(taskKey, {
          taskId: comment.id,
          title: comment.filePath ? `Review for ${comment.filePath}` : 'General comment',
          status: comment.isResolved ? 'completed' : 'in_progress',
          assigneeId: comment.authorId,
          assigneeName: comment.authorName,
          completedAt: comment.isResolved ? comment.updatedAt : null,
          failedAt: null,
        });
      } else {
        const existing = taskMap.get(taskKey)!;
        if (comment.isResolved && existing.status !== 'completed') {
          existing.status = 'completed';
          existing.completedAt = comment.updatedAt;
        }
      }
    }

    const tasks = Array.from(taskMap.values());

    log.debug('Task status collected', { reviewId, taskCount: tasks.length });
    return { success: true, data: tasks };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Failed to collect task status', { reviewId, error: errorMessage });
    return { success: false, error: `Failed to collect task status: ${errorMessage}` };
  }
}

/**
 * Collects conversation summary from review comments
 */
async function collectConversationSummary(reviewId: string): Promise<CollectResult<ConversationSummary>> {
  try {
    const comments = await prisma.reviewComment.findMany({
      where: { reviewId },
      orderBy: { createdAt: 'asc' },
    });

    const commentSummaries = comments.map((comment): ConversationSummary['comments'][0] => ({
      id: comment.id,
      content: comment.content,
      authorName: comment.authorName,
      createdAt: comment.createdAt,
      isResolved: comment.isResolved,
      severity: comment.severity || null,
      filePath: comment.filePath || null,
      lineStart: comment.lineStart || null,
    }));

    const summary: ConversationSummary = {
      totalComments: comments.length,
      resolvedComments: comments.filter((c) => c.isResolved).length,
      unresolvedComments: comments.filter((c) => !c.isResolved).length,
      comments: commentSummaries,
    };

    log.debug('Conversation summary collected', { reviewId, totalComments: summary.totalComments });
    return { success: true, data: summary };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Failed to collect conversation summary', { reviewId, error: errorMessage });
    return { success: false, error: `Failed to collect conversation summary: ${errorMessage}` };
  }
}

/**
 * Collects PR diff information
 */
async function collectPRDiff(params: GetPRDiffParams | undefined): Promise<CollectResult<PRDiffInfo | null>> {
  if (!params) {
    log.debug('No PR params provided, skipping diff collection');
    return { success: true, data: null };
  }

  try {
    const result = await getPRDiff(params);

    if (!result.success) {
      log.warn('Failed to fetch PR diff', { params, error: result.error });
      return { success: true, data: null }; // Non-fatal, return null
    }

    const prDiff: PRDiffInfo = {
      owner: result.data.owner,
      repo: result.data.repo,
      pullNumber: result.data.pullNumber,
      files: result.data.files.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch,
      })),
      totalAdditions: result.data.totalAdditions,
      totalDeletions: result.data.totalDeletions,
      totalChanges: result.data.totalChanges,
    };

    log.debug('PR diff collected', {
      owner: prDiff.owner,
      repo: prDiff.repo,
      pullNumber: prDiff.pullNumber,
      fileCount: prDiff.files.length,
    });

    return { success: true, data: prDiff };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Failed to collect PR diff', { params, error: errorMessage });
    return { success: false, error: `Failed to collect PR diff: ${errorMessage}` };
  }
}

/**
 * Collects all context data for generating a test report
 *
 * @param params - Parameters including reviewId and optional PR info
 * @returns TestReportContext with all collected data or an error
 */
export async function collectTestReportContext(
  params: CollectTestReportContextParams
): Promise<CollectResult<TestReportContext>> {
  const { reviewId, prParams } = params;

  log.info('Starting test report context collection', { reviewId });

  try {
    // Collect all data in parallel for efficiency
    const [executionResult, tasksResult, conversationResult, prDiffResult] = await Promise.all([
      collectExecutionData(reviewId),
      collectTaskStatus(reviewId),
      collectConversationSummary(reviewId),
      collectPRDiff(prParams),
    ]);

    // Check for critical errors
    if (!executionResult.success) {
      return executionResult as CollectError;
    }
    if (!tasksResult.success) {
      return tasksResult as CollectError;
    }
    if (!conversationResult.success) {
      return conversationResult as CollectError;
    }
    if (!prDiffResult.success) {
      return prDiffResult as CollectError;
    }

    // Get plan info from execution data
    const planResult = await collectPlanInfo(executionResult.data);
    if (!planResult.success) {
      return planResult as CollectError;
    }

    const context: TestReportContext = {
      execution: executionResult.data,
      plan: planResult.data,
      tasks: tasksResult.data,
      conversation: conversationResult.data,
      prDiff: prDiffResult.data,
      collectedAt: new Date(),
    };

    log.info('Test report context collection completed', {
      reviewId,
      taskCount: context.tasks.length,
      commentCount: context.conversation.totalComments,
      hasPrDiff: context.prDiff !== null,
    });

    return { success: true, data: context };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Failed to collect test report context', { reviewId, error: errorMessage });
    return { success: false, error: `Failed to collect test report context: ${errorMessage}` };
  }
}

/**
 * Creates a TestReport from the collected context
 */
export async function createTestReportFromContext(
  context: TestReportContext,
  title: string,
  recommendation: 'MERGE' | 'NEEDS_CHANGES' | 'REJECT'
): Promise<CollectResult<TestReport>> {
  try {
    const completedTasks = context.tasks.filter((t) => t.status === 'completed').length;
    const failedTasks = context.tasks.filter((t) => t.status === 'failed').length;
    const skippedTasks = context.tasks.filter((t) => t.status === 'skipped').length;

    const testReport = await prisma.testReport.create({
      data: {
        title,
        recommendation,
        totalTasks: context.tasks.length,
        completedTasks,
        failedTasks,
        skippedTasks,
        repositoryName: context.plan?.repositoryName || null,
        repositoryUrl: context.plan?.repositoryUrl || null,
        branchName: context.plan?.branchName || null,
        commitSha: context.plan?.commitSha || null,
        pullRequestId: context.plan?.pullRequestId || null,
        pullRequestUrl: context.plan?.pullRequestUrl || null,
        summary: context.conversation.totalComments > 0
          ? `Collected ${context.conversation.totalComments} comments with ${context.conversation.resolvedComments} resolved`
          : null,
        authorId: context.execution?.authorId || null,
        authorName: context.execution?.authorName || null,
        executedAt: context.collectedAt,
      },
    });

    log.info('Test report created from context', {
      reportId: testReport.id,
      title,
      recommendation,
    });

    return { success: true, data: testReport };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Failed to create test report from context', { error: errorMessage });
    return { success: false, error: `Failed to create test report: ${errorMessage}` };
  }
}