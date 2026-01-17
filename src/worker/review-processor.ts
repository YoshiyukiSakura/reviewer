/**
 * Review Processor Module
 *
 * Coordinates the complete code review workflow:
 * 1. Fetches PR diff from GitHub
 * 2. Calls AI reviewer for code analysis
 * 3. Saves review results to the database
 *
 * This module can be used standalone or integrated with the PR Monitor
 * to automatically process incoming Pull Requests.
 */

import { getPRDiff, type PullRequestDiff, type GetPRDiffParams } from '../lib/github/pr-diff';
import {
  AIReviewer,
  createReviewerFromEnv,
  type AIReviewResult,
  type AIReviewComment,
  type ReviewRequest,
} from '../lib/ai/reviewer';
import { prisma } from '../lib/prisma';
import { log } from '../lib/remote-log';
import type { ReviewStatus, CommentSeverity } from '../types';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Configuration for the Review Processor
 */
export interface ReviewProcessorConfig {
  /** AI Reviewer instance (optional - will create from env if not provided) */
  aiReviewer?: AIReviewer;
  /** Whether to skip saving to database (useful for dry runs) */
  dryRun?: boolean;
  /** Maximum number of retries for API failures */
  maxRetries?: number;
  /** Delay between retries in milliseconds */
  retryDelayMs?: number;
}

/**
 * Parameters for processing a single PR review
 */
export interface ProcessPRParams {
  /** Repository owner */
  owner: string;
  /** Repository name */
  repo: string;
  /** Pull request number */
  pullNumber: number;
  /** PR title for context */
  prTitle?: string;
  /** PR description for context */
  prDescription?: string;
  /** Author ID for the review record */
  authorId?: string;
  /** Author name for display */
  authorName?: string;
}

/**
 * Result of processing a PR review
 */
export interface ProcessPRResult {
  /** Whether the processing was successful */
  success: boolean;
  /** Review ID if created in database */
  reviewId?: string;
  /** AI review result data */
  aiResult?: AIReviewResult;
  /** Error message if failed */
  error?: string;
  /** Error code for programmatic handling */
  errorCode?: 'DIFF_FETCH_FAILED' | 'AI_REVIEW_FAILED' | 'DB_SAVE_FAILED' | 'UNKNOWN';
  /** Duration of the entire process in milliseconds */
  durationMs: number;
}

/**
 * Status update callback for monitoring progress
 */
export type StatusCallback = (status: {
  phase: 'fetching_diff' | 'reviewing' | 'saving' | 'completed' | 'failed';
  message: string;
  progress?: number;
}) => void;

// ============================================================================
// Review Processor Class
// ============================================================================

/**
 * Review Processor - Orchestrates the complete PR review workflow
 *
 * @example
 * ```typescript
 * const processor = new ReviewProcessor();
 *
 * const result = await processor.processPR({
 *   owner: 'octocat',
 *   repo: 'hello-world',
 *   pullNumber: 42,
 *   prTitle: 'Add new feature',
 *   authorId: 'user-123',
 * });
 *
 * if (result.success) {
 *   console.log(`Review created: ${result.reviewId}`);
 *   console.log(`AI Score: ${result.aiResult?.score}`);
 * } else {
 *   console.error(`Failed: ${result.error}`);
 * }
 * ```
 */
export class ReviewProcessor {
  private aiReviewer: AIReviewer;
  private config: Required<Omit<ReviewProcessorConfig, 'aiReviewer'>>;

  /**
   * Creates a new Review Processor instance
   * @param config - Configuration options
   */
  constructor(config: ReviewProcessorConfig = {}) {
    this.aiReviewer = config.aiReviewer || createReviewerFromEnv();
    this.config = {
      dryRun: config.dryRun ?? false,
      maxRetries: config.maxRetries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 1000,
    };
  }

  /**
   * Processes a complete PR review workflow
   *
   * Steps:
   * 1. Fetch the PR diff from GitHub
   * 2. Send the diff to AI reviewer for analysis
   * 3. Save the review and comments to the database
   *
   * @param params - PR identification and metadata
   * @param onStatus - Optional callback for status updates
   * @returns ProcessPRResult with review data or error information
   */
  async processPR(
    params: ProcessPRParams,
    onStatus?: StatusCallback
  ): Promise<ProcessPRResult> {
    const startTime = Date.now();
    const { owner, repo, pullNumber, prTitle, prDescription, authorId, authorName } = params;

    const logContext = { owner, repo, pullNumber };

    try {
      // Phase 1: Fetch the PR diff
      onStatus?.({
        phase: 'fetching_diff',
        message: `Fetching diff for ${owner}/${repo}#${pullNumber}`,
        progress: 10,
      });

      await log.info('Fetching PR diff', logContext);

      const diffResult = await this.fetchDiffWithRetry({ owner, repo, pullNumber });

      if (!diffResult.success) {
        await log.error('Failed to fetch PR diff', { ...logContext, error: diffResult.error });
        onStatus?.({ phase: 'failed', message: diffResult.error });

        return {
          success: false,
          error: diffResult.error,
          errorCode: 'DIFF_FETCH_FAILED',
          durationMs: Date.now() - startTime,
        };
      }

      const diff = diffResult.data;
      await log.info('PR diff fetched successfully', {
        ...logContext,
        fileCount: diff.files.length,
        totalChanges: diff.totalChanges,
      });

      // Phase 2: AI Review
      onStatus?.({
        phase: 'reviewing',
        message: 'Analyzing code with AI',
        progress: 40,
      });

      await log.info('Starting AI review', logContext);

      const aiResult = await this.performAIReview(diff, prTitle, prDescription);

      if (!aiResult.success) {
        await log.error('AI review failed', { ...logContext, error: aiResult.error });
        onStatus?.({ phase: 'failed', message: aiResult.error });

        return {
          success: false,
          error: aiResult.error,
          errorCode: 'AI_REVIEW_FAILED',
          durationMs: Date.now() - startTime,
        };
      }

      await log.info('AI review completed', {
        ...logContext,
        score: aiResult.data.score,
        commentsCount: aiResult.data.comments.length,
        approval: aiResult.data.approval,
      });

      // Phase 3: Save to database
      onStatus?.({
        phase: 'saving',
        message: 'Saving review to database',
        progress: 80,
      });

      let reviewId: string | undefined;

      if (!this.config.dryRun) {
        const saveResult = await this.saveReviewToDatabase({
          owner,
          repo,
          pullNumber,
          prTitle: prTitle || `PR #${pullNumber}`,
          aiResult: aiResult.data,
          authorId: authorId || 'system',
          authorName,
        });

        if (!saveResult.success) {
          await log.error('Failed to save review', { ...logContext, error: saveResult.error });
          onStatus?.({ phase: 'failed', message: saveResult.error });

          return {
            success: false,
            error: saveResult.error,
            errorCode: 'DB_SAVE_FAILED',
            aiResult: aiResult.data,
            durationMs: Date.now() - startTime,
          };
        }

        reviewId = saveResult.reviewId;
        await log.info('Review saved to database', { ...logContext, reviewId });
      } else {
        await log.info('Dry run mode - skipping database save', logContext);
      }

      // Phase 4: Complete
      const durationMs = Date.now() - startTime;
      onStatus?.({
        phase: 'completed',
        message: 'Review completed successfully',
        progress: 100,
      });

      await log.info('PR review completed', {
        ...logContext,
        reviewId,
        durationMs,
      });

      return {
        success: true,
        reviewId,
        aiResult: aiResult.data,
        durationMs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      await log.error('Unexpected error during PR review', {
        ...logContext,
        error: errorMessage,
      });

      onStatus?.({ phase: 'failed', message: errorMessage });

      return {
        success: false,
        error: errorMessage,
        errorCode: 'UNKNOWN',
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Processes multiple PRs in sequence
   *
   * @param prs - Array of PR parameters to process
   * @param onStatus - Optional callback for overall progress
   * @returns Array of ProcessPRResult for each PR
   */
  async processBatch(
    prs: ProcessPRParams[],
    onStatus?: (index: number, total: number, result: ProcessPRResult) => void
  ): Promise<ProcessPRResult[]> {
    const results: ProcessPRResult[] = [];

    for (let i = 0; i < prs.length; i++) {
      const result = await this.processPR(prs[i]);
      results.push(result);
      onStatus?.(i + 1, prs.length, result);
    }

    return results;
  }

  /**
   * Fetches PR diff with retry logic
   */
  private async fetchDiffWithRetry(
    params: GetPRDiffParams
  ): Promise<{ success: true; data: PullRequestDiff } | { success: false; error: string }> {
    let lastError = '';

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      const result = await getPRDiff(params);

      if (result.success) {
        return result;
      }

      lastError = result.error;

      // Don't retry on certain errors
      if (
        result.error.includes('not found') ||
        result.error.includes('Invalid') ||
        result.error.includes('expired')
      ) {
        break;
      }

      if (attempt < this.config.maxRetries) {
        await this.delay(this.config.retryDelayMs * attempt);
      }
    }

    return { success: false, error: lastError };
  }

  /**
   * Performs AI review on the PR diff
   */
  private async performAIReview(
    diff: PullRequestDiff,
    prTitle?: string,
    prDescription?: string
  ): Promise<{ success: true; data: AIReviewResult } | { success: false; error: string }> {
    // If there are multiple files, review each file individually and aggregate
    if (diff.files.length > 1) {
      const filesWithPatches = diff.files.filter((f) => f.patch);

      if (filesWithPatches.length === 0) {
        return {
          success: true,
          data: {
            summary: 'No reviewable code changes found',
            comments: [],
            approval: 'approve',
            score: 10,
            model: 'gpt-4o' as const,
            durationMs: 0,
          },
        };
      }

      // For multi-file PRs, combine patches with file markers
      const combinedDiff = filesWithPatches
        .map((f) => `### ${f.filename}\n${f.patch}`)
        .join('\n\n');

      const request: ReviewRequest = {
        diff: combinedDiff,
        prTitle,
        prDescription,
        reviewType: 'comprehensive',
      };

      const result = await this.aiReviewer.review(request);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Map comments to correct file paths
      const mappedComments = this.mapCommentsToFiles(result.data.comments, filesWithPatches);

      return {
        success: true,
        data: {
          ...result.data,
          comments: mappedComments,
        },
      };
    }

    // Single file or no files
    const file = diff.files[0];
    if (!file?.patch) {
      return {
        success: true,
        data: {
          summary: 'No reviewable code changes found',
          comments: [],
          approval: 'approve',
          score: 10,
          model: 'gpt-4o' as const,
          durationMs: 0,
        },
      };
    }

    const request: ReviewRequest = {
      diff: file.patch,
      filePath: file.filename,
      prTitle,
      prDescription,
      reviewType: 'comprehensive',
    };

    const result = await this.aiReviewer.review(request);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return result;
  }

  /**
   * Maps AI comments to their correct file paths based on diff markers
   */
  private mapCommentsToFiles(
    comments: AIReviewComment[],
    files: Array<{ filename: string; patch?: string }>
  ): AIReviewComment[] {
    // If comments already have filePath, return as-is
    if (comments.every((c) => c.filePath)) {
      return comments;
    }

    // Try to map comments to files based on context
    return comments.map((comment) => {
      // If comment already has a file path, keep it
      if (comment.filePath) {
        return comment;
      }

      // Find the file this comment most likely belongs to
      // This is a heuristic - ideally the AI would provide file paths
      for (const file of files) {
        if (file.filename && comment.comment.toLowerCase().includes(file.filename.toLowerCase())) {
          return { ...comment, filePath: file.filename };
        }
      }

      // Default to first file if we can't determine
      return { ...comment, filePath: files[0]?.filename };
    });
  }

  /**
   * Saves the review and comments to the database
   */
  private async saveReviewToDatabase(params: {
    owner: string;
    repo: string;
    pullNumber: number;
    prTitle: string;
    aiResult: AIReviewResult;
    authorId: string;
    authorName?: string;
  }): Promise<{ success: true; reviewId: string } | { success: false; error: string }> {
    try {
      const { owner, repo, pullNumber, prTitle, aiResult, authorId, authorName } = params;

      // Map AI approval to ReviewStatus
      const status: ReviewStatus = this.mapApprovalToStatus(aiResult.approval);

      // Create review with comments in a transaction
      const review = await prisma.review.create({
        data: {
          title: prTitle,
          description: aiResult.summary,
          status,
          sourceType: 'pull_request',
          sourceId: `${owner}/${repo}#${pullNumber}`,
          sourceUrl: `https://github.com/${owner}/${repo}/pull/${pullNumber}`,
          authorId,
          authorName: authorName || 'AI Reviewer',
          comments: {
            create: aiResult.comments.map((comment) => ({
              content: this.formatCommentContent(comment),
              filePath: comment.filePath,
              lineStart: comment.line,
              lineEnd: comment.line,
              severity: this.mapSeverity(comment.severity),
              authorId,
              authorName: authorName || 'AI Reviewer',
            })),
          },
        },
        include: {
          comments: true,
        },
      });

      return { success: true, reviewId: review.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Database error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Maps AI approval status to ReviewStatus enum
   */
  private mapApprovalToStatus(approval: AIReviewResult['approval']): ReviewStatus {
    switch (approval) {
      case 'approve':
        return 'APPROVED';
      case 'request_changes':
        return 'CHANGES_REQUESTED';
      case 'comment':
      default:
        return 'IN_PROGRESS';
    }
  }

  /**
   * Maps AI comment severity to database CommentSeverity
   */
  private mapSeverity(severity: AIReviewComment['severity']): CommentSeverity {
    // AI reviewer already uses uppercase, but ensure consistency
    const severityMap: Record<string, CommentSeverity> = {
      CRITICAL: 'CRITICAL',
      WARNING: 'WARNING',
      SUGGESTION: 'SUGGESTION',
      INFO: 'INFO',
    };
    return severityMap[severity] || 'INFO';
  }

  /**
   * Formats AI comment for storage
   */
  private formatCommentContent(comment: AIReviewComment): string {
    let content = comment.comment;

    if (comment.suggestion) {
      content += `\n\n**Suggested fix:**\n${comment.suggestion}`;
    }

    return content;
  }

  /**
   * Helper to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a Review Processor with default configuration from environment
 * @returns ReviewProcessor instance
 */
export function createReviewProcessor(config?: ReviewProcessorConfig): ReviewProcessor {
  return new ReviewProcessor(config);
}

/**
 * Creates a Review Processor configured for dry-run mode (no database writes)
 * @returns ReviewProcessor instance in dry-run mode
 */
export function createDryRunProcessor(config?: Omit<ReviewProcessorConfig, 'dryRun'>): ReviewProcessor {
  return new ReviewProcessor({ ...config, dryRun: true });
}

// ============================================================================
// Standalone Processing Function
// ============================================================================

/**
 * Processes a single PR review - convenience function for simple usage
 *
 * @example
 * ```typescript
 * const result = await processReview({
 *   owner: 'octocat',
 *   repo: 'hello-world',
 *   pullNumber: 42,
 * });
 *
 * if (result.success) {
 *   console.log('Review saved:', result.reviewId);
 * }
 * ```
 */
export async function processReview(
  params: ProcessPRParams,
  config?: ReviewProcessorConfig
): Promise<ProcessPRResult> {
  const processor = new ReviewProcessor(config);
  return processor.processPR(params);
}

// ============================================================================
// Export Default
// ============================================================================

export default ReviewProcessor;
