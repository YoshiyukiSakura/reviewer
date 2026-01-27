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
import { createPRReview, type ReviewComment, type ReviewEvent } from '../lib/github/pr-reviews';
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
// GitHub Action Types
// ============================================================================

/**
 * GitHub Actions workflow event types
 */
export type GitHubActionEventType =
  | 'pull_request'
  | 'pull_request_review'
  | 'push';

/**
 * Base structure for GitHub Actions event payload
 */
export interface GitHubActionEventPayload {
  action?: string;
  sender?: {
    login: string;
    id: number;
  };
  repository?: {
    owner: {
      login: string;
      name?: string;
    };
    name: string;
    full_name: string;
  };
  pull_request?: {
    number: number;
    title: string;
    body: string | null;
    head: {
      sha: string;
      ref: string;
    };
    base: {
      ref: string;
    };
    user: {
      login: string;
      id: number;
    };
    html_url: string;
  };
}

/**
 * Pull Request event payload from GitHub Actions
 */
export interface PullRequestActionPayload extends GitHubActionEventPayload {
  action: 'opened' | 'synchronize' | 'reopened';
  pull_request: {
    number: number;
    title: string;
    body: string | null;
    head: {
      sha: string;
      ref: string;
    };
    base: {
      ref: string;
    };
    user: {
      login: string;
      id: number;
    };
    html_url: string;
  };
}

/**
 * Pull Request Review event payload from GitHub Actions
 */
export interface PullRequestReviewActionPayload extends GitHubActionEventPayload {
  action: 'submitted' | 'edited' | 'dismissed';
  review: {
    id: number;
    body: string | null;
    state: string;
    commit_id: string;
    pull_request_url: string;
    user: {
      login: string;
      id: number;
    };
  };
  pull_request: {
    number: number;
    title: string;
    body: string | null;
    head: {
      sha: string;
      ref: string;
    };
    base: {
      ref: string;
    };
    user: {
      login: string;
      id: number;
    };
    html_url: string;
  };
}

/**
 * Configuration for GitHub Action processor
 */
export interface GitHubActionProcessorConfig extends ReviewProcessorConfig {
  /** GitHub token for API authentication (defaults to GITHUB_TOKEN env) */
  githubToken?: string;
  /** Whether to post review comments back to GitHub */
  postToGitHub?: boolean;
  /** Custom event path (defaults to GITHUB_EVENT_PATH env) */
  eventPath?: string;
}

/**
 * Result of processing a GitHub Action review
 */
export interface ProcessGitHubActionResult {
  /** Whether the processing was successful */
  success: boolean;
  /** Review ID if created in database */
  reviewId?: string;
  /** AI review result data */
  aiResult?: AIReviewResult;
  /** Whether the review was posted to GitHub */
  postedToGitHub?: boolean;
  /** Error message if failed */
  error?: string;
  /** Error code for programmatic handling */
  errorCode?: 'INVALID_EVENT' | 'DIFF_FETCH_FAILED' | 'AI_REVIEW_FAILED' | 'DB_SAVE_FAILED' | 'GITHUB_POST_FAILED' | 'UNKNOWN';
  /** Duration of the entire process in milliseconds */
  durationMs: number;
}

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

      // Don't retry on certain errors (case-insensitive)
      const lowerError = result.error.toLowerCase();
      if (
        lowerError.includes('not found') ||
        lowerError.includes('invalid') ||
        lowerError.includes('expired')
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
// GitHub Action Review Processor
// ============================================================================

/**
 * GitHubActionReviewProcessor - Handles PR reviews triggered by GitHub Actions
 *
 * This processor reads GitHub Actions workflow events and processes PR reviews
 * accordingly. It can post review comments directly back to GitHub.
 *
 * @example
 * ```typescript
 * const processor = new GitHubActionReviewProcessor();
 *
 * const result = await processor.processFromEvent();
 *
 * if (result.success) {
 *   console.log('Review completed:', result.reviewId);
 * }
 * ```
 */
export class GitHubActionReviewProcessor {
  private config: Required<Omit<GitHubActionProcessorConfig, 'aiReviewer'>>;
  private aiReviewer: AIReviewer;

  /**
   * Creates a new GitHub Action Review Processor instance
   * @param config - Configuration options
   */
  constructor(config: GitHubActionProcessorConfig = {}) {
    this.aiReviewer = config.aiReviewer || createReviewerFromEnv();
    this.config = {
      dryRun: config.dryRun ?? false,
      maxRetries: config.maxRetries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 1000,
      githubToken: config.githubToken || process.env.GITHUB_TOKEN || '',
      postToGitHub: config.postToGitHub ?? true,
      eventPath: config.eventPath || process.env.GITHUB_EVENT_PATH || '',
    };
  }

  /**
   * Reads and parses the GitHub Actions event file
   * @returns Parsed event payload or error
   */
  private readEventPayload(): Promise<{ success: true; data: GitHubActionEventPayload } | { success: false; error: string }> {
    return new Promise((resolve) => {
      const eventPath = this.config.eventPath;

      if (!eventPath) {
        return resolve({ success: false, error: 'GITHUB_EVENT_PATH is not set' });
      }

      // Check if running in GitHub Actions environment
      if (!process.env.GITHUB_ACTIONS) {
        return resolve({ success: false, error: 'Not running in GitHub Actions environment' });
      }

      import('fs/promises')
        .then(async (fs) => {
          try {
            const content = await fs.readFile(eventPath, 'utf-8');
            const payload = JSON.parse(content) as GitHubActionEventPayload;

            if (!payload.pull_request) {
              return resolve({ success: false, error: 'Event payload does not contain pull_request data' });
            }

            return resolve({ success: true, data: payload });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to read event file';
            return resolve({ success: false, error: errorMessage });
          }
        })
        .catch((error) => {
          resolve({ success: false, error: error instanceof Error ? error.message : 'Failed to read event file' });
        });
    });
  }

  /**
   * Processes a PR review from GitHub Actions event
   *
   * Steps:
   * 1. Read the GitHub Actions event file
   * 2. Extract PR information from the event
   * 3. Fetch the PR diff
   * 4. Perform AI review
   * 5. Save review to database
   * 6. Optionally post review to GitHub
   *
   * @param onStatus - Optional callback for status updates
   * @returns ProcessGitHubActionResult with review data or error information
   */
  async processFromEvent(
    onStatus?: StatusCallback
  ): Promise<ProcessGitHubActionResult> {
    const startTime = Date.now();
    let reviewId: string | undefined;
    let postedToGitHub = false;

    try {
      // Phase 1: Read GitHub Actions event
      onStatus?.({
        phase: 'fetching_diff',
        message: 'Reading GitHub Actions event',
        progress: 10,
      });

      await log.info('Reading GitHub Actions event');

      const eventResult = await this.readEventPayload();

      if (!eventResult.success) {
        await log.error('Failed to read GitHub Actions event', { error: eventResult.error });
        onStatus?.({ phase: 'failed', message: eventResult.error });

        return {
          success: false,
          error: eventResult.error,
          errorCode: 'INVALID_EVENT',
          durationMs: Date.now() - startTime,
        };
      }

      const payload = eventResult.data;
      const pr = payload.pull_request!;

      // Validate repository information
      if (!payload.repository?.owner?.login || !payload.repository?.name) {
        return {
          success: false,
          error: 'Invalid repository information in event payload',
          errorCode: 'INVALID_EVENT',
          durationMs: Date.now() - startTime,
        };
      }

      const owner = payload.repository.owner.login;
      const repo = payload.repository.name;
      const pullNumber = pr.number;

      const logContext = { owner, repo, pullNumber };

      await log.info('Processing GitHub Action PR review', {
        ...logContext,
        action: payload.action,
        sha: pr.head.sha,
      });

      // Phase 2: Fetch the PR diff
      onStatus?.({
        phase: 'fetching_diff',
        message: `Fetching diff for ${owner}/${repo}#${pullNumber}`,
        progress: 20,
      });

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

      // Phase 3: AI Review
      onStatus?.({
        phase: 'reviewing',
        message: 'Analyzing code with AI',
        progress: 50,
      });

      await log.info('Starting AI review', logContext);

      const aiResult = await this.performAIReview(diff, pr.title, pr.body || undefined);

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

      // Phase 4: Save to database
      onStatus?.({
        phase: 'saving',
        message: 'Saving review to database',
        progress: 80,
      });

      if (!this.config.dryRun) {
        const saveResult = await this.saveReviewToDatabase({
          owner,
          repo,
          pullNumber,
          prTitle: pr.title,
          aiResult: aiResult.data,
          authorId: payload.sender?.id?.toString() || 'github-action',
          authorName: payload.sender?.login || 'GitHub Action',
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

      // Phase 5: Post to GitHub if enabled
      if (this.config.postToGitHub && !this.config.dryRun) {
        onStatus?.({
          phase: 'saving',
          message: 'Posting review to GitHub',
          progress: 90,
        });

        const postResult = await this.postReviewToGitHub({
          owner,
          repo,
          pullNumber,
          aiResult: aiResult.data,
        });

        if (!postResult.success) {
          await log.warn('Failed to post review to GitHub', {
            ...logContext,
            error: postResult.error,
          });
          // Don't fail the whole process if posting fails
        } else {
          postedToGitHub = true;
          await log.info('Review posted to GitHub', logContext);
        }
      }

      // Phase 6: Complete
      const durationMs = Date.now() - startTime;
      onStatus?.({
        phase: 'completed',
        message: 'Review completed successfully',
        progress: 100,
      });

      await log.info('GitHub Action PR review completed', {
        ...logContext,
        reviewId,
        postedToGitHub,
        durationMs,
      });

      return {
        success: true,
        reviewId,
        aiResult: aiResult.data,
        postedToGitHub,
        durationMs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      await log.error('Unexpected error during GitHub Action PR review', {
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
   * Processes a specific PR from GitHub Actions context
   *
   * @param params - PR identification parameters
   * @param onStatus - Optional callback for status updates
   * @returns ProcessGitHubActionResult with review data or error information
   */
  async processPR(
    params: ProcessPRParams,
    onStatus?: StatusCallback
  ): Promise<ProcessGitHubActionResult> {
    const startTime = Date.now();
    const { owner, repo, pullNumber, prTitle, prDescription, authorId, authorName } = params;
    let reviewId: string | undefined;
    let postedToGitHub = false;

    try {
      // Phase 1: Fetch the PR diff
      onStatus?.({
        phase: 'fetching_diff',
        message: `Fetching diff for ${owner}/${repo}#${pullNumber}`,
        progress: 20,
      });

      await log.info('Fetching PR diff', { owner, repo, pullNumber });

      const diffResult = await this.fetchDiffWithRetry({ owner, repo, pullNumber });

      if (!diffResult.success) {
        await log.error('Failed to fetch PR diff', { owner, repo, pullNumber, error: diffResult.error });
        onStatus?.({ phase: 'failed', message: diffResult.error });

        return {
          success: false,
          error: diffResult.error,
          errorCode: 'DIFF_FETCH_FAILED',
          durationMs: Date.now() - startTime,
        };
      }

      const diff = diffResult.data;

      // Phase 2: AI Review
      onStatus?.({
        phase: 'reviewing',
        message: 'Analyzing code with AI',
        progress: 50,
      });

      await log.info('Starting AI review', { owner, repo, pullNumber });

      const aiResult = await this.performAIReview(diff, prTitle, prDescription);

      if (!aiResult.success) {
        await log.error('AI review failed', { owner, repo, pullNumber, error: aiResult.error });
        onStatus?.({ phase: 'failed', message: aiResult.error });

        return {
          success: false,
          error: aiResult.error,
          errorCode: 'AI_REVIEW_FAILED',
          durationMs: Date.now() - startTime,
        };
      }

      // Phase 3: Save to database
      onStatus?.({
        phase: 'saving',
        message: 'Saving review to database',
        progress: 80,
      });

      if (!this.config.dryRun) {
        const saveResult = await this.saveReviewToDatabase({
          owner,
          repo,
          pullNumber,
          prTitle: prTitle || `PR #${pullNumber}`,
          aiResult: aiResult.data,
          authorId: authorId || 'github-action',
          authorName,
        });

        if (!saveResult.success) {
          await log.error('Failed to save review', { owner, repo, pullNumber, error: saveResult.error });
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
      }

      // Phase 4: Post to GitHub if enabled
      if (this.config.postToGitHub && !this.config.dryRun) {
        onStatus?.({
          phase: 'saving',
          message: 'Posting review to GitHub',
          progress: 90,
        });

        const postResult = await this.postReviewToGitHub({
          owner,
          repo,
          pullNumber,
          aiResult: aiResult.data,
        });

        if (!postResult.success) {
          await log.warn('Failed to post review to GitHub', { owner, repo, pullNumber, error: postResult.error });
        } else {
          postedToGitHub = true;
        }
      }

      // Complete
      const durationMs = Date.now() - startTime;
      onStatus?.({
        phase: 'completed',
        message: 'Review completed successfully',
        progress: 100,
      });

      return {
        success: true,
        reviewId,
        aiResult: aiResult.data,
        postedToGitHub,
        durationMs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      return {
        success: false,
        error: errorMessage,
        errorCode: 'UNKNOWN',
        durationMs: Date.now() - startTime,
      };
    }
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

      const lowerError = result.error.toLowerCase();
      if (
        lowerError.includes('not found') ||
        lowerError.includes('invalid') ||
        lowerError.includes('expired')
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

      const mappedComments = this.mapCommentsToFiles(result.data.comments, filesWithPatches);

      return {
        success: true,
        data: {
          ...result.data,
          comments: mappedComments,
        },
      };
    }

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
   * Maps AI comments to their correct file paths
   */
  private mapCommentsToFiles(
    comments: AIReviewComment[],
    files: Array<{ filename: string; patch?: string }>
  ): AIReviewComment[] {
    if (comments.every((c) => c.filePath)) {
      return comments;
    }

    return comments.map((comment) => {
      if (comment.filePath) {
        return comment;
      }

      for (const file of files) {
        if (file.filename && comment.comment.toLowerCase().includes(file.filename.toLowerCase())) {
          return { ...comment, filePath: file.filename };
        }
      }

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

      const status: ReviewStatus = this.mapApprovalToStatus(aiResult.approval);

      const review = await prisma.review.create({
        data: {
          title: prTitle,
          description: aiResult.summary,
          status,
          sourceType: 'pull_request',
          sourceId: `${owner}/${repo}#${pullNumber}`,
          sourceUrl: `https://github.com/${owner}/${repo}/pull/${pullNumber}`,
          authorId,
          authorName: authorName || 'GitHub Action',
          comments: {
            create: aiResult.comments.map((comment) => ({
              content: this.formatCommentContent(comment),
              filePath: comment.filePath,
              lineStart: comment.line,
              lineEnd: comment.line,
              severity: this.mapSeverity(comment.severity),
              authorId,
              authorName: authorName || 'GitHub Action',
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
   * Posts the review to GitHub as a PR review
   */
  private async postReviewToGitHub(params: {
    owner: string;
    repo: string;
    pullNumber: number;
    aiResult: AIReviewResult;
  }): Promise<{ success: true } | { success: false; error: string }> {
    const { owner, repo, pullNumber, aiResult } = params;

    try {
      // Convert AI comments to GitHub review comments
      const comments: ReviewComment[] = aiResult.comments
        .filter((comment) => comment.filePath && comment.line)
        .map((comment) => ({
          path: comment.filePath!,
          line: comment.line,
          body: this.formatCommentContent(comment),
        }));

      // Determine review event based on AI approval
      let event: ReviewEvent = 'COMMENT';
      if (aiResult.approval === 'approve') {
        event = 'APPROVE';
      } else if (aiResult.approval === 'request_changes') {
        event = 'REQUEST_CHANGES';
      }

      // Create the review on GitHub
      const result = await createPRReview(
        { owner, repo, pullNumber },
        {
          body: aiResult.summary,
          event,
          comments: comments.length > 0 ? comments : undefined,
        }
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to post to GitHub';
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
// GitHub Action Factory Functions
// ============================================================================

/**
 * Creates a GitHub Action Review Processor with default configuration
 * @returns GitHubActionReviewProcessor instance
 */
export function createGitHubActionProcessor(config?: GitHubActionProcessorConfig): GitHubActionReviewProcessor {
  return new GitHubActionReviewProcessor(config);
}

/**
 * Creates a GitHub Action Review Processor configured for dry-run mode
 * @returns GitHubActionReviewProcessor instance in dry-run mode
 */
export function createGitHubActionDryRunProcessor(
  config?: Omit<GitHubActionProcessorConfig, 'dryRun'>
): GitHubActionReviewProcessor {
  return new GitHubActionReviewProcessor({ ...config, dryRun: true });
}

/**
 * Creates a GitHub Action Review Processor that doesn't post to GitHub
 * @returns GitHubActionReviewProcessor instance with postToGitHub disabled
 */
export function createGitHubActionReviewOnlyProcessor(
  config?: Omit<GitHubActionProcessorConfig, 'postToGitHub'>
): GitHubActionReviewProcessor {
  return new GitHubActionReviewProcessor({ ...config, postToGitHub: false });
}

/**
 * Processes a PR review from GitHub Actions event - convenience function
 *
 * @example
 * ```typescript
 * const result = await processGitHubActionReview();
 *
 * if (result.success) {
 *   console.log('Review completed:', result.reviewId);
 * }
 * ```
 */
export async function processGitHubActionReview(
  config?: GitHubActionProcessorConfig
): Promise<ProcessGitHubActionResult> {
  const processor = new GitHubActionReviewProcessor(config);
  return processor.processFromEvent();
}

// ============================================================================
// Export Default
// ============================================================================

export default ReviewProcessor;
