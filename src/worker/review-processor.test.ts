/**
 * Tests for Review Processor Module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ReviewProcessor,
  createReviewProcessor,
  createDryRunProcessor,
  processReview,
  GitHubActionReviewProcessor,
  createGitHubActionProcessor,
  createGitHubActionDryRunProcessor,
  createGitHubActionReviewOnlyProcessor,
  processGitHubActionReview,
  type ProcessPRParams,
  type StatusCallback,
} from './review-processor';

// Mock dependencies
vi.mock('../lib/github/pr-diff', () => ({
  getPRDiff: vi.fn(),
}));

vi.mock('../lib/github/pr-reviews', () => ({
  createPRReview: vi.fn(),
}));

vi.mock('../lib/ai/reviewer', () => ({
  createReviewerFromEnv: vi.fn(() => ({
    review: vi.fn(),
    reviewPR: vi.fn(),
  })),
  AIReviewer: vi.fn(),
}));

vi.mock('../lib/prisma', () => ({
  prisma: {
    review: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../lib/test-report/trigger', () => ({
  triggerTestReportAsync: vi.fn(),
  isReviewCompleted: vi.fn(),
}));

vi.mock('../lib/remote-log', () => ({
  log: {
    debug: vi.fn().mockResolvedValue(undefined),
    info: vi.fn().mockResolvedValue(undefined),
    warn: vi.fn().mockResolvedValue(undefined),
    error: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

// Import mocked modules
import { getPRDiff } from '../lib/github/pr-diff';
import { createPRReview } from '../lib/github/pr-reviews';
import { createReviewerFromEnv } from '../lib/ai/reviewer';
import { prisma } from '../lib/prisma';
import { log } from '../lib/remote-log';
import { triggerTestReportAsync, isReviewCompleted } from '../lib/test-report/trigger';

// Type assertions for mocks
const mockGetPRDiff = getPRDiff as ReturnType<typeof vi.fn>;
const mockCreatePRReview = createPRReview as ReturnType<typeof vi.fn>;
const mockCreateReviewerFromEnv = createReviewerFromEnv as ReturnType<typeof vi.fn>;
const mockPrismaReviewCreate = prisma.review.create as ReturnType<typeof vi.fn>;
const mockPrismaReviewFindUnique = prisma.review.findUnique as ReturnType<typeof vi.fn>;
const mockTriggerTestReportAsync = triggerTestReportAsync as ReturnType<typeof vi.fn>;
const mockIsReviewCompleted = isReviewCompleted as ReturnType<typeof vi.fn>;

// Sample test data
const samplePRParams: ProcessPRParams = {
  owner: 'octocat',
  repo: 'hello-world',
  pullNumber: 42,
  prTitle: 'Add new feature',
  prDescription: 'This PR adds a new feature',
  authorId: 'user-123',
  authorName: 'Test User',
};

const sampleDiffResult = {
  success: true,
  data: {
    owner: 'octocat',
    repo: 'hello-world',
    pullNumber: 42,
    files: [
      {
        filename: 'src/app.ts',
        status: 'modified' as const,
        additions: 10,
        deletions: 5,
        changes: 15,
        patch: `@@ -1,5 +1,10 @@
+ const foo = 'bar';
- const old = 'value';`,
      },
    ],
    totalAdditions: 10,
    totalDeletions: 5,
    totalChanges: 15,
  },
};

const sampleAIResult = {
  success: true,
  data: {
    summary: 'This PR looks good overall',
    comments: [
      {
        line: 1,
        severity: 'WARNING' as const,
        category: 'correctness' as const,
        comment: 'Consider using a constant here',
        suggestion: 'export const FOO = "bar";',
        filePath: 'src/app.ts',
      },
    ],
    approval: 'approve' as const,
    score: 8,
    model: 'claude-3-5-sonnet' as const,
    durationMs: 1500,
  },
};

const sampleReviewRecord = {
  id: 'review-abc123',
  title: 'Add new feature',
  description: 'This PR looks good overall',
  status: 'APPROVED',
  sourceType: 'pull_request',
  sourceId: 'octocat/hello-world#42',
  sourceUrl: 'https://github.com/octocat/hello-world/pull/42',
  authorId: 'user-123',
  authorName: 'Test User',
  createdAt: new Date(),
  updatedAt: new Date(),
  comments: [],
};

describe('ReviewProcessor', () => {
  let mockReviewer: { review: ReturnType<typeof vi.fn>; reviewPR: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    mockReviewer = {
      review: vi.fn().mockResolvedValue(sampleAIResult),
      reviewPR: vi.fn().mockResolvedValue(sampleAIResult),
    };

    mockCreateReviewerFromEnv.mockReturnValue(mockReviewer);
    mockGetPRDiff.mockResolvedValue(sampleDiffResult);
    mockPrismaReviewCreate.mockResolvedValue(sampleReviewRecord);
    mockPrismaReviewFindUnique.mockResolvedValue({ ...sampleReviewRecord, status: 'APPROVED' });
    mockTriggerTestReportAsync.mockImplementation(() => {});
    mockIsReviewCompleted.mockReturnValue(true);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should create processor with default configuration', () => {
      const processor = new ReviewProcessor();
      expect(processor).toBeInstanceOf(ReviewProcessor);
      expect(mockCreateReviewerFromEnv).toHaveBeenCalled();
    });

    it('should create processor with custom AI reviewer', () => {
      const customReviewer = {
        review: vi.fn(),
        reviewPR: vi.fn(),
      };

      // @ts-expect-error - Using partial mock for testing
      const processor = new ReviewProcessor({ aiReviewer: customReviewer });
      expect(processor).toBeInstanceOf(ReviewProcessor);
      expect(mockCreateReviewerFromEnv).not.toHaveBeenCalled();
    });

    it('should create processor with custom configuration', () => {
      const processor = new ReviewProcessor({
        dryRun: true,
        maxRetries: 5,
        retryDelayMs: 2000,
      });
      expect(processor).toBeInstanceOf(ReviewProcessor);
    });
  });

  describe('processPR', () => {
    it('should process a PR successfully', async () => {
      const processor = new ReviewProcessor();
      const result = await processor.processPR(samplePRParams);

      expect(result.success).toBe(true);
      expect(result.reviewId).toBe('review-abc123');
      expect(result.aiResult).toBeDefined();
      expect(result.aiResult?.score).toBe(8);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should call status callback with progress updates', async () => {
      const processor = new ReviewProcessor();
      const statusCallback: StatusCallback = vi.fn();

      await processor.processPR(samplePRParams, statusCallback);

      expect(statusCallback).toHaveBeenCalledWith(
        expect.objectContaining({ phase: 'fetching_diff' })
      );
      expect(statusCallback).toHaveBeenCalledWith(
        expect.objectContaining({ phase: 'reviewing' })
      );
      expect(statusCallback).toHaveBeenCalledWith(
        expect.objectContaining({ phase: 'saving' })
      );
      expect(statusCallback).toHaveBeenCalledWith(
        expect.objectContaining({ phase: 'completed' })
      );
    });

    it('should handle diff fetch failure', async () => {
      mockGetPRDiff.mockResolvedValue({
        success: false,
        error: 'Repository not found',
      });

      const processor = new ReviewProcessor();
      const result = await processor.processPR(samplePRParams);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('DIFF_FETCH_FAILED');
      expect(result.error).toBe('Repository not found');
    });

    it('should handle AI review failure', async () => {
      mockReviewer.review.mockResolvedValue({
        success: false,
        error: 'AI API timeout',
      });

      const processor = new ReviewProcessor();
      const result = await processor.processPR(samplePRParams);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('AI_REVIEW_FAILED');
      expect(result.error).toBe('AI API timeout');
    });

    it('should handle database save failure', async () => {
      mockPrismaReviewCreate.mockRejectedValue(new Error('Database connection failed'));

      const processor = new ReviewProcessor();
      const result = await processor.processPR(samplePRParams);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('DB_SAVE_FAILED');
      expect(result.aiResult).toBeDefined(); // AI result should still be available
    });

    it('should skip database save in dry run mode', async () => {
      const processor = new ReviewProcessor({ dryRun: true });
      const result = await processor.processPR(samplePRParams);

      expect(result.success).toBe(true);
      expect(result.reviewId).toBeUndefined();
      expect(result.aiResult).toBeDefined();
      expect(mockPrismaReviewCreate).not.toHaveBeenCalled();
    });

    it('should retry on transient diff fetch errors', async () => {
      mockGetPRDiff
        .mockResolvedValueOnce({ success: false, error: 'Rate limit exceeded' })
        .mockResolvedValueOnce({ success: false, error: 'Rate limit exceeded' })
        .mockResolvedValueOnce(sampleDiffResult);

      const processor = new ReviewProcessor({
        maxRetries: 3,
        retryDelayMs: 10, // Short delay for testing
      });

      const result = await processor.processPR(samplePRParams);

      expect(result.success).toBe(true);
      expect(mockGetPRDiff).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      mockGetPRDiff.mockResolvedValue({
        success: false,
        error: 'Repository not found',
      });

      const processor = new ReviewProcessor({
        maxRetries: 3,
        retryDelayMs: 10,
      });

      const result = await processor.processPR(samplePRParams);

      expect(result.success).toBe(false);
      expect(mockGetPRDiff).toHaveBeenCalledTimes(1);
    });

    it('should handle PRs with no reviewable changes', async () => {
      mockGetPRDiff.mockResolvedValue({
        success: true,
        data: {
          ...sampleDiffResult.data,
          files: [{ filename: 'README.md', status: 'modified', additions: 1, deletions: 0, changes: 1 }],
        },
      });

      const processor = new ReviewProcessor();
      const result = await processor.processPR(samplePRParams);

      expect(result.success).toBe(true);
      expect(result.aiResult?.summary).toBe('No reviewable code changes found');
    });

    it('should handle multi-file PRs', async () => {
      mockGetPRDiff.mockResolvedValue({
        success: true,
        data: {
          ...sampleDiffResult.data,
          files: [
            {
              filename: 'src/app.ts',
              status: 'modified',
              additions: 10,
              deletions: 5,
              changes: 15,
              patch: '+ const foo = 1;',
            },
            {
              filename: 'src/utils.ts',
              status: 'added',
              additions: 20,
              deletions: 0,
              changes: 20,
              patch: '+ export function helper() {}',
            },
          ],
          totalChanges: 35,
        },
      });

      const processor = new ReviewProcessor();
      const result = await processor.processPR(samplePRParams);

      expect(result.success).toBe(true);
      expect(mockReviewer.review).toHaveBeenCalledWith(
        expect.objectContaining({
          diff: expect.stringContaining('### src/app.ts'),
          reviewType: 'comprehensive',
        })
      );
    });

    it('should log all phases correctly', async () => {
      const processor = new ReviewProcessor();
      await processor.processPR(samplePRParams);

      expect(log.info).toHaveBeenCalledWith('Fetching PR diff', expect.any(Object));
      expect(log.info).toHaveBeenCalledWith('PR diff fetched successfully', expect.any(Object));
      expect(log.info).toHaveBeenCalledWith('Starting AI review', expect.any(Object));
      expect(log.info).toHaveBeenCalledWith('AI review completed', expect.any(Object));
      expect(log.info).toHaveBeenCalledWith('Review saved to database', expect.any(Object));
      expect(log.info).toHaveBeenCalledWith('PR review completed', expect.any(Object));
    });
  });

  describe('processBatch', () => {
    it('should process multiple PRs in sequence', async () => {
      const processor = new ReviewProcessor();
      const prs: ProcessPRParams[] = [
        { ...samplePRParams, pullNumber: 1 },
        { ...samplePRParams, pullNumber: 2 },
        { ...samplePRParams, pullNumber: 3 },
      ];

      const results = await processor.processBatch(prs);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should call progress callback for each PR', async () => {
      const processor = new ReviewProcessor();
      const prs: ProcessPRParams[] = [
        { ...samplePRParams, pullNumber: 1 },
        { ...samplePRParams, pullNumber: 2 },
      ];

      const progressCallback = vi.fn();
      await processor.processBatch(prs, progressCallback);

      expect(progressCallback).toHaveBeenCalledTimes(2);
      expect(progressCallback).toHaveBeenCalledWith(1, 2, expect.any(Object));
      expect(progressCallback).toHaveBeenCalledWith(2, 2, expect.any(Object));
    });

    it('should continue processing even if one PR fails', async () => {
      mockGetPRDiff
        .mockResolvedValueOnce(sampleDiffResult)
        .mockResolvedValueOnce({ success: false, error: 'Not found' })
        .mockResolvedValueOnce(sampleDiffResult);

      const processor = new ReviewProcessor();
      const prs: ProcessPRParams[] = [
        { ...samplePRParams, pullNumber: 1 },
        { ...samplePRParams, pullNumber: 2 },
        { ...samplePRParams, pullNumber: 3 },
      ];

      const results = await processor.processBatch(prs);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });

  describe('approval status mapping', () => {
    it('should map approve to APPROVED status', async () => {
      mockReviewer.review.mockResolvedValue({
        success: true,
        data: { ...sampleAIResult.data, approval: 'approve' },
      });

      const processor = new ReviewProcessor();
      await processor.processPR(samplePRParams);

      expect(mockPrismaReviewCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'APPROVED',
          }),
        })
      );
    });

    it('should map request_changes to CHANGES_REQUESTED status', async () => {
      mockReviewer.review.mockResolvedValue({
        success: true,
        data: { ...sampleAIResult.data, approval: 'request_changes' },
      });

      const processor = new ReviewProcessor();
      await processor.processPR(samplePRParams);

      expect(mockPrismaReviewCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'CHANGES_REQUESTED',
          }),
        })
      );
    });

    it('should map comment to IN_PROGRESS status', async () => {
      mockReviewer.review.mockResolvedValue({
        success: true,
        data: { ...sampleAIResult.data, approval: 'comment' },
      });

      const processor = new ReviewProcessor();
      await processor.processPR(samplePRParams);

      expect(mockPrismaReviewCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'IN_PROGRESS',
          }),
        })
      );
    });
  });

  describe('comment formatting', () => {
    it('should include suggestion in comment content when available', async () => {
      const processor = new ReviewProcessor();
      await processor.processPR(samplePRParams);

      expect(mockPrismaReviewCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            comments: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({
                  content: expect.stringContaining('**Suggested fix:**'),
                }),
              ]),
            }),
          }),
        })
      );
    });

    it('should map severity correctly', async () => {
      const processor = new ReviewProcessor();
      await processor.processPR(samplePRParams);

      expect(mockPrismaReviewCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            comments: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({
                  severity: 'WARNING',
                }),
              ]),
            }),
          }),
        })
      );
    });
  });

  describe('autoGenerateTestReport', () => {
    it('should trigger test report generation by default when review is completed', async () => {
      mockIsReviewCompleted.mockReturnValue(true);

      const processor = new ReviewProcessor();
      await processor.processPR(samplePRParams);

      expect(mockTriggerTestReportAsync).toHaveBeenCalledWith({
        reviewId: 'review-abc123',
      });
    });

    it('should not trigger test report when autoGenerateTestReport is disabled', async () => {
      mockIsReviewCompleted.mockReturnValue(true);

      const processor = new ReviewProcessor({ autoGenerateTestReport: false });
      await processor.processPR(samplePRParams);

      expect(mockTriggerTestReportAsync).not.toHaveBeenCalled();
    });

    it('should not trigger test report when review is not completed', async () => {
      mockIsReviewCompleted.mockReturnValue(false);

      const processor = new ReviewProcessor();
      await processor.processPR(samplePRParams);

      expect(mockTriggerTestReportAsync).not.toHaveBeenCalled();
    });

    it('should not trigger test report in dry run mode', async () => {
      const processor = new ReviewProcessor({ dryRun: true });
      await processor.processPR(samplePRParams);

      expect(mockTriggerTestReportAsync).not.toHaveBeenCalled();
    });

    it('should check review status before triggering test report', async () => {
      mockPrismaReviewFindUnique.mockResolvedValue({ ...sampleReviewRecord, status: 'APPROVED' });
      mockIsReviewCompleted.mockReturnValue(true);

      const processor = new ReviewProcessor();
      await processor.processPR(samplePRParams);

      expect(mockPrismaReviewFindUnique).toHaveBeenCalledWith({
        where: { id: 'review-abc123' },
        select: { status: true },
      });
    });
  });
});

describe('Factory Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateReviewerFromEnv.mockReturnValue({
      review: vi.fn(),
      reviewPR: vi.fn(),
    });
  });

  describe('createReviewProcessor', () => {
    it('should create a ReviewProcessor with default config', () => {
      const processor = createReviewProcessor();
      expect(processor).toBeInstanceOf(ReviewProcessor);
    });

    it('should create a ReviewProcessor with custom config', () => {
      const processor = createReviewProcessor({ maxRetries: 5 });
      expect(processor).toBeInstanceOf(ReviewProcessor);
    });
  });

  describe('createDryRunProcessor', () => {
    it('should create a ReviewProcessor in dry-run mode', () => {
      const processor = createDryRunProcessor();
      expect(processor).toBeInstanceOf(ReviewProcessor);
    });
  });
});

describe('processReview convenience function', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const mockReviewer = {
      review: vi.fn().mockResolvedValue(sampleAIResult),
      reviewPR: vi.fn(),
    };

    mockCreateReviewerFromEnv.mockReturnValue(mockReviewer);
    mockGetPRDiff.mockResolvedValue(sampleDiffResult);
    mockPrismaReviewCreate.mockResolvedValue(sampleReviewRecord);
  });

  it('should process a PR review with minimal params', async () => {
    const result = await processReview({
      owner: 'octocat',
      repo: 'hello-world',
      pullNumber: 42,
    });

    expect(result.success).toBe(true);
    expect(result.reviewId).toBeDefined();
  });

  it('should accept custom configuration', async () => {
    const result = await processReview(samplePRParams, { dryRun: true });

    expect(result.success).toBe(true);
    expect(result.reviewId).toBeUndefined();
    expect(mockPrismaReviewCreate).not.toHaveBeenCalled();
  });
});

// ============================================================================
// GitHub Action Review Processor Tests
// ============================================================================

describe('GitHubActionReviewProcessor', () => {
  let mockReviewer: { review: ReturnType<typeof vi.fn>; reviewPR: ReturnType<typeof vi.fn> };
  let mockReadFile: ReturnType<typeof vi.fn>;

  const sampleGitHubEvent = {
    action: 'opened',
    sender: {
      login: 'octocat',
      id: 1,
    },
    repository: {
      owner: {
        login: 'octocat',
      },
      name: 'hello-world',
      full_name: 'octocat/hello-world',
    },
    pull_request: {
      number: 42,
      title: 'Add new feature',
      body: 'This PR adds a new feature',
      head: {
        sha: 'abc123',
        ref: 'feature-branch',
      },
      base: {
        ref: 'main',
      },
      user: {
        login: 'octocat',
        id: 1,
      },
      html_url: 'https://github.com/octocat/hello-world/pull/42',
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup default mock implementations
    mockReviewer = {
      review: vi.fn().mockResolvedValue(sampleAIResult),
      reviewPR: vi.fn().mockResolvedValue(sampleAIResult),
    };

    mockReadFile = vi.fn();

    mockCreateReviewerFromEnv.mockReturnValue(mockReviewer);
    mockGetPRDiff.mockResolvedValue(sampleDiffResult);
    mockPrismaReviewCreate.mockResolvedValue(sampleReviewRecord);
    mockCreatePRReview.mockResolvedValue({ success: true, data: { id: 123 } });

    // Setup fs/promises mock
    const fs = await import('fs/promises');
    vi.spyOn(fs, 'readFile').mockImplementation(mockReadFile);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should create processor with default configuration', () => {
      const processor = new GitHubActionReviewProcessor();
      expect(processor).toBeInstanceOf(GitHubActionReviewProcessor);
      expect(mockCreateReviewerFromEnv).toHaveBeenCalled();
    });

    it('should create processor with custom configuration', () => {
      const processor = new GitHubActionReviewProcessor({
        dryRun: true,
        postToGitHub: false,
        maxRetries: 5,
      });
      expect(processor).toBeInstanceOf(GitHubActionReviewProcessor);
    });

    it('should default postToGitHub to true', () => {
      const processor = new GitHubActionReviewProcessor();
      expect(processor).toBeInstanceOf(GitHubActionReviewProcessor);
    });
  });

  describe('processFromEvent', () => {
    it('should process GitHub event successfully', async () => {
      // Mock environment
      vi.stubEnv('GITHUB_ACTIONS', 'true');
      vi.stubEnv('GITHUB_EVENT_PATH', '/tmp/event.json');
      mockReadFile.mockResolvedValue(JSON.stringify(sampleGitHubEvent));

      const processor = new GitHubActionReviewProcessor();
      const result = await processor.processFromEvent();

      expect(result.success).toBe(true);
      expect(result.reviewId).toBe('review-abc123');
      expect(result.postedToGitHub).toBe(true);
      expect(result.aiResult).toBeDefined();
    });

    it('should fail when not in GitHub Actions environment', async () => {
      vi.stubEnv('GITHUB_ACTIONS', undefined);

      const processor = new GitHubActionReviewProcessor();
      const result = await processor.processFromEvent();

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_EVENT');
      expect(result.error).toContain('Not running in GitHub Actions environment');
    });

    it('should fail when GITHUB_EVENT_PATH is not set', async () => {
      vi.stubEnv('GITHUB_ACTIONS', 'true');
      vi.stubEnv('GITHUB_EVENT_PATH', undefined);

      const processor = new GitHubActionReviewProcessor();
      const result = await processor.processFromEvent();

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_EVENT');
    });

    it('should fail when event payload is invalid', async () => {
      vi.stubEnv('GITHUB_ACTIONS', 'true');
      vi.stubEnv('GITHUB_EVENT_PATH', '/tmp/event.json');
      mockReadFile.mockResolvedValue('{}');

      const processor = new GitHubActionReviewProcessor();
      const result = await processor.processFromEvent();

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_EVENT');
    });

    it('should handle diff fetch failure', async () => {
      vi.stubEnv('GITHUB_ACTIONS', 'true');
      vi.stubEnv('GITHUB_EVENT_PATH', '/tmp/event.json');
      mockReadFile.mockResolvedValue(JSON.stringify(sampleGitHubEvent));
      mockGetPRDiff.mockResolvedValue({ success: false, error: 'Repository not found' });

      const processor = new GitHubActionReviewProcessor();
      const result = await processor.processFromEvent();

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('DIFF_FETCH_FAILED');
    });

    it('should handle AI review failure', async () => {
      vi.stubEnv('GITHUB_ACTIONS', 'true');
      vi.stubEnv('GITHUB_EVENT_PATH', '/tmp/event.json');
      mockReadFile.mockResolvedValue(JSON.stringify(sampleGitHubEvent));
      mockReviewer.review.mockResolvedValue({ success: false, error: 'AI API timeout' });

      const processor = new GitHubActionReviewProcessor();
      const result = await processor.processFromEvent();

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('AI_REVIEW_FAILED');
    });

    it('should skip database save in dry run mode', async () => {
      vi.stubEnv('GITHUB_ACTIONS', 'true');
      vi.stubEnv('GITHUB_EVENT_PATH', '/tmp/event.json');
      mockReadFile.mockResolvedValue(JSON.stringify(sampleGitHubEvent));

      const processor = new GitHubActionReviewProcessor({ dryRun: true });
      const result = await processor.processFromEvent();

      expect(result.success).toBe(true);
      expect(result.reviewId).toBeUndefined();
      expect(mockPrismaReviewCreate).not.toHaveBeenCalled();
    });

    it('should skip posting to GitHub when disabled', async () => {
      vi.stubEnv('GITHUB_ACTIONS', 'true');
      vi.stubEnv('GITHUB_EVENT_PATH', '/tmp/event.json');
      mockReadFile.mockResolvedValue(JSON.stringify(sampleGitHubEvent));

      const processor = new GitHubActionReviewProcessor({ postToGitHub: false });
      const result = await processor.processFromEvent();

      expect(result.success).toBe(true);
      expect(result.postedToGitHub).toBe(false); // false when disabled, undefined means not set
      expect(mockCreatePRReview).not.toHaveBeenCalled();
    });

    it('should handle GitHub post failure gracefully', async () => {
      vi.stubEnv('GITHUB_ACTIONS', 'true');
      vi.stubEnv('GITHUB_EVENT_PATH', '/tmp/event.json');
      mockReadFile.mockResolvedValue(JSON.stringify(sampleGitHubEvent));
      mockCreatePRReview.mockResolvedValue({ success: false, error: 'Failed to post review' });

      const processor = new GitHubActionReviewProcessor();
      const result = await processor.processFromEvent();

      expect(result.success).toBe(true); // Should still succeed
      expect(result.postedToGitHub).toBe(false);
    });

    it('should call status callback with progress updates', async () => {
      vi.stubEnv('GITHUB_ACTIONS', 'true');
      vi.stubEnv('GITHUB_EVENT_PATH', '/tmp/event.json');
      mockReadFile.mockResolvedValue(JSON.stringify(sampleGitHubEvent));

      const processor = new GitHubActionReviewProcessor();
      const statusCallback: StatusCallback = vi.fn();

      await processor.processFromEvent(statusCallback);

      expect(statusCallback).toHaveBeenCalledWith(
        expect.objectContaining({ phase: 'fetching_diff' })
      );
      expect(statusCallback).toHaveBeenCalledWith(
        expect.objectContaining({ phase: 'reviewing' })
      );
      expect(statusCallback).toHaveBeenCalledWith(
        expect.objectContaining({ phase: 'saving' })
      );
      expect(statusCallback).toHaveBeenCalledWith(
        expect.objectContaining({ phase: 'completed' })
      );
    });
  });

  describe('processPR', () => {
    it('should process a PR successfully', async () => {
      const processor = new GitHubActionReviewProcessor({ postToGitHub: false });
      const result = await processor.processPR(samplePRParams);

      expect(result.success).toBe(true);
      expect(result.reviewId).toBe('review-abc123');
      expect(result.aiResult).toBeDefined();
    });

    it('should handle diff fetch failure', async () => {
      mockGetPRDiff.mockResolvedValue({ success: false, error: 'Repository not found' });

      const processor = new GitHubActionReviewProcessor({ postToGitHub: false });
      const result = await processor.processPR(samplePRParams);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('DIFF_FETCH_FAILED');
    });

    it('should skip database save in dry run mode', async () => {
      const processor = new GitHubActionReviewProcessor({ dryRun: true, postToGitHub: false });
      const result = await processor.processPR(samplePRParams);

      expect(result.success).toBe(true);
      expect(result.reviewId).toBeUndefined();
      expect(mockPrismaReviewCreate).not.toHaveBeenCalled();
    });

    it('should post review to GitHub based on approval', async () => {
      mockReviewer.review.mockResolvedValue({
        success: true,
        data: { ...sampleAIResult.data, approval: 'approve' },
      });

      // Set up the mock to be called
      const mockPostReview = vi.fn().mockResolvedValue({ success: true, data: { id: 123 } });

      // Import and spy on createPRReview
      const { createPRReview: originalCreatePRReview } = await import('../lib/github/pr-reviews');
      vi.spyOn(await import('../lib/github/pr-reviews'), 'createPRReview').mockImplementation(mockPostReview);

      const processor = new GitHubActionReviewProcessor({ postToGitHub: true });
      const result = await processor.processPR(samplePRParams);

      expect(result.success).toBe(true);
      expect(result.postedToGitHub).toBe(true);
      expect(mockPostReview).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: samplePRParams.owner,
          repo: samplePRParams.repo,
          pullNumber: samplePRParams.pullNumber,
        }),
        expect.objectContaining({
          event: 'APPROVE',
        })
      );
    });

    it('should post REQUEST_CHANGES when approval is request_changes', async () => {
      mockReviewer.review.mockResolvedValue({
        success: true,
        data: { ...sampleAIResult.data, approval: 'request_changes' },
      });

      const mockPostReview = vi.fn().mockResolvedValue({ success: true, data: { id: 123 } });
      vi.spyOn(await import('../lib/github/pr-reviews'), 'createPRReview').mockImplementation(mockPostReview);

      const processor = new GitHubActionReviewProcessor({ postToGitHub: true });
      const result = await processor.processPR(samplePRParams);

      expect(result.success).toBe(true);
      expect(mockPostReview).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          event: 'REQUEST_CHANGES',
        })
      );
    });
  });
});

describe('GitHub Action Factory Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateReviewerFromEnv.mockReturnValue({
      review: vi.fn(),
      reviewPR: vi.fn(),
    });
  });

  describe('createGitHubActionProcessor', () => {
    it('should create a GitHubActionReviewProcessor with default config', () => {
      const processor = createGitHubActionProcessor();
      expect(processor).toBeInstanceOf(GitHubActionReviewProcessor);
    });

    it('should create a GitHubActionReviewProcessor with custom config', () => {
      const processor = createGitHubActionProcessor({ maxRetries: 5 });
      expect(processor).toBeInstanceOf(GitHubActionReviewProcessor);
    });
  });

  describe('createGitHubActionDryRunProcessor', () => {
    it('should create a GitHubActionReviewProcessor in dry-run mode', () => {
      const processor = createGitHubActionDryRunProcessor();
      expect(processor).toBeInstanceOf(GitHubActionReviewProcessor);
    });
  });

  describe('createGitHubActionReviewOnlyProcessor', () => {
    it('should create a GitHubActionReviewProcessor with postToGitHub disabled', () => {
      const processor = createGitHubActionReviewOnlyProcessor();
      expect(processor).toBeInstanceOf(GitHubActionReviewProcessor);
    });
  });
});

describe('processGitHubActionReview convenience function', () => {
  let mockReviewer: { review: ReturnType<typeof vi.fn>; reviewPR: ReturnType<typeof vi.fn> };
  let mockReadFile: ReturnType<typeof vi.fn>;

  const sampleGitHubEvent = {
    action: 'opened',
    sender: { login: 'octocat', id: 1 },
    repository: {
      owner: { login: 'octocat' },
      name: 'hello-world',
      full_name: 'octocat/hello-world',
    },
    pull_request: {
      number: 42,
      title: 'Add new feature',
      body: 'This PR adds a new feature',
      head: { sha: 'abc123', ref: 'feature-branch' },
      base: { ref: 'main' },
      user: { login: 'octocat', id: 1 },
      html_url: 'https://github.com/octocat/hello-world/pull/42',
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockReviewer = {
      review: vi.fn().mockResolvedValue(sampleAIResult),
      reviewPR: vi.fn().mockResolvedValue(sampleAIResult),
    };

    mockReadFile = vi.fn();

    mockCreateReviewerFromEnv.mockReturnValue(mockReviewer);
    mockGetPRDiff.mockResolvedValue(sampleDiffResult);
    mockPrismaReviewCreate.mockResolvedValue(sampleReviewRecord);
    mockCreatePRReview.mockResolvedValue({ success: true, data: { id: 123 } });

    const fs = await import('fs/promises');
    vi.spyOn(fs, 'readFile').mockImplementation(mockReadFile);
  });

  it('should process a GitHub Action review with minimal params', async () => {
    vi.stubEnv('GITHUB_ACTIONS', 'true');
    vi.stubEnv('GITHUB_EVENT_PATH', '/tmp/event.json');
    mockReadFile.mockResolvedValue(JSON.stringify(sampleGitHubEvent));

    const result = await processGitHubActionReview({ postToGitHub: false });

    expect(result.success).toBe(true);
    expect(result.reviewId).toBeDefined();
  });
});

// ============================================================================
// GitHub Action Mode - Extended Tests
// ============================================================================

describe('GitHubActionReviewProcessor - Extended Scenarios', () => {
  let mockReviewer: { review: ReturnType<typeof vi.fn>; reviewPR: ReturnType<typeof vi.fn> };
  let mockReadFile: ReturnType<typeof vi.fn>;

  const sampleGitHubEvent = {
    action: 'opened',
    sender: { login: 'octocat', id: 1 },
    repository: {
      owner: { login: 'octocat' },
      name: 'hello-world',
      full_name: 'octocat/hello-world',
    },
    pull_request: {
      number: 42,
      title: 'Add new feature',
      body: 'This PR adds a new feature',
      head: { sha: 'abc123', ref: 'feature-branch' },
      base: { ref: 'main' },
      user: { login: 'octocat', id: 1 },
      html_url: 'https://github.com/octocat/hello-world/pull/42',
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockReviewer = {
      review: vi.fn().mockResolvedValue(sampleAIResult),
      reviewPR: vi.fn().mockResolvedValue(sampleAIResult),
    };

    mockReadFile = vi.fn();

    mockCreateReviewerFromEnv.mockReturnValue(mockReviewer);
    mockGetPRDiff.mockResolvedValue(sampleDiffResult);
    mockPrismaReviewCreate.mockResolvedValue(sampleReviewRecord);
    mockCreatePRReview.mockResolvedValue({ success: true, data: { id: 123 } });

    const fs = await import('fs/promises');
    vi.spyOn(fs, 'readFile').mockImplementation(mockReadFile);
  });

  describe('processFromEvent - Multi-file PR handling', () => {
    it('should process multi-file PR successfully', async () => {
      vi.stubEnv('GITHUB_ACTIONS', 'true');
      vi.stubEnv('GITHUB_EVENT_PATH', '/tmp/event.json');
      mockReadFile.mockResolvedValue(JSON.stringify(sampleGitHubEvent));
      mockGetPRDiff.mockResolvedValue({
        success: true,
        data: {
          ...sampleDiffResult.data,
          files: [
            {
              filename: 'src/app.ts',
              status: 'modified' as const,
              additions: 10,
              deletions: 5,
              changes: 15,
              patch: '+ const foo = 1;',
            },
            {
              filename: 'src/utils.ts',
              status: 'added' as const,
              additions: 20,
              deletions: 0,
              changes: 20,
              patch: '+ export function helper() {}',
            },
          ],
          totalChanges: 35,
        },
      });

      const processor = new GitHubActionReviewProcessor({ postToGitHub: false });
      const result = await processor.processFromEvent();

      expect(result.success).toBe(true);
      expect(mockReviewer.review).toHaveBeenCalledWith(
        expect.objectContaining({
          diff: expect.stringContaining('### src/app.ts'),
          reviewType: 'comprehensive',
        })
      );
    });
  });

  describe('processFromEvent - No reviewable changes', () => {
    it('should handle PRs with no reviewable changes', async () => {
      vi.stubEnv('GITHUB_ACTIONS', 'true');
      vi.stubEnv('GITHUB_EVENT_PATH', '/tmp/event.json');
      mockReadFile.mockResolvedValue(JSON.stringify(sampleGitHubEvent));
      mockGetPRDiff.mockResolvedValue({
        success: true,
        data: {
          ...sampleDiffResult.data,
          files: [{ filename: 'README.md', status: 'modified', additions: 1, deletions: 0, changes: 1 }],
        },
      });

      const processor = new GitHubActionReviewProcessor({ postToGitHub: false });
      const result = await processor.processFromEvent();

      expect(result.success).toBe(true);
      expect(result.aiResult?.summary).toBe('No reviewable code changes found');
      expect(result.aiResult?.comments).toHaveLength(0);
    });
  });

  describe('processFromEvent - File read errors', () => {
    it('should handle JSON parse errors', async () => {
      vi.stubEnv('GITHUB_ACTIONS', 'true');
      vi.stubEnv('GITHUB_EVENT_PATH', '/tmp/event.json');
      mockReadFile.mockResolvedValue('invalid json content');

      const processor = new GitHubActionReviewProcessor();
      const result = await processor.processFromEvent();

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_EVENT');
    });

    it('should handle file read errors', async () => {
      vi.stubEnv('GITHUB_ACTIONS', 'true');
      vi.stubEnv('GITHUB_EVENT_PATH', '/tmp/event.json');
      mockReadFile.mockRejectedValue(new Error('ENOENT: no such file'));

      const processor = new GitHubActionReviewProcessor();
      const result = await processor.processFromEvent();

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_EVENT');
    });

    it('should handle missing pull_request in payload', async () => {
      vi.stubEnv('GITHUB_ACTIONS', 'true');
      vi.stubEnv('GITHUB_EVENT_PATH', '/tmp/event.json');
      mockReadFile.mockResolvedValue(JSON.stringify({ action: 'opened' }));

      const processor = new GitHubActionReviewProcessor();
      const result = await processor.processFromEvent();

      expect(result.success).toBe(false);
      expect(result.error).toContain('pull_request');
    });
  });

  describe('processFromEvent - Repository validation', () => {
    it('should fail when repository owner is missing', async () => {
      vi.stubEnv('GITHUB_ACTIONS', 'true');
      vi.stubEnv('GITHUB_EVENT_PATH', '/tmp/event.json');
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          ...sampleGitHubEvent,
          repository: {
            ...sampleGitHubEvent.repository,
            owner: {},
          },
        })
      );

      const processor = new GitHubActionReviewProcessor();
      const result = await processor.processFromEvent();

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_EVENT');
    });

    it('should fail when repository name is missing', async () => {
      vi.stubEnv('GITHUB_ACTIONS', 'true');
      vi.stubEnv('GITHUB_EVENT_PATH', '/tmp/event.json');
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          ...sampleGitHubEvent,
          repository: {
            ...sampleGitHubEvent.repository,
            name: undefined,
          },
        })
      );

      const processor = new GitHubActionReviewProcessor();
      const result = await processor.processFromEvent();

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_EVENT');
    });
  });

  describe('processPR - Extended scenarios', () => {
    it('should handle PR with different AI approval statuses', async () => {
      mockReviewer.review.mockResolvedValue({
        success: true,
        data: { ...sampleAIResult.data, approval: 'approve', score: 10 },
      });

      mockCreatePRReview.mockResolvedValue({ success: true, data: { id: 456 } });

      const processor = new GitHubActionReviewProcessor({ postToGitHub: true });
      const result = await processor.processPR(samplePRParams);

      expect(result.success).toBe(true);
      expect(result.postedToGitHub).toBe(true);
    });

    it('should handle AI result with request_changes approval', async () => {
      mockReviewer.review.mockResolvedValue({
        success: true,
        data: { ...sampleAIResult.data, approval: 'request_changes' },
      });

      const processor = new GitHubActionReviewProcessor({ postToGitHub: true });
      const result = await processor.processPR(samplePRParams);

      expect(result.success).toBe(true);
      expect(result.aiResult?.approval).toBe('request_changes');
    });

    it('should handle AI result with comment approval', async () => {
      mockReviewer.review.mockResolvedValue({
        success: true,
        data: { ...sampleAIResult.data, approval: 'comment' },
      });

      const processor = new GitHubActionReviewProcessor({ postToGitHub: true });
      const result = await processor.processPR(samplePRParams);

      expect(result.success).toBe(true);
      expect(result.aiResult?.approval).toBe('comment');
    });

    it('should preserve AI comments with suggestions', async () => {
      mockReviewer.review.mockResolvedValue({
        success: true,
        data: {
          ...sampleAIResult.data,
          comments: [
            {
              line: 5,
              severity: 'WARNING' as const,
              category: 'best-practices' as const,
              comment: 'Consider using async/await instead of callbacks',
              suggestion: 'await fetchData()',
              filePath: 'src/service.ts',
            },
          ],
        },
      });

      const processor = new GitHubActionReviewProcessor({ postToGitHub: false });
      const result = await processor.processPR(samplePRParams);

      expect(result.success).toBe(true);
      expect(mockPrismaReviewCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            comments: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({
                  content: expect.stringContaining('**Suggested fix:**'),
                }),
              ]),
            }),
          }),
        })
      );
    });

    it('should handle comments without filePath', async () => {
      mockReviewer.review.mockResolvedValue({
        success: true,
        data: {
          ...sampleAIResult.data,
          comments: [
            {
              line: 10,
              severity: 'INFO' as const,
              category: 'documentation' as const,
              comment: 'Consider adding JSDoc comments',
            },
          ],
        },
      });

      const processor = new GitHubActionReviewProcessor({ postToGitHub: false });
      const result = await processor.processPR(samplePRParams);

      expect(result.success).toBe(true);
      // Should still save even without filePath
      expect(mockPrismaReviewCreate).toHaveBeenCalled();
    });
  });

  describe('processFromEvent - Logging', () => {
    it('should log all phases correctly in GitHub Action mode', async () => {
      vi.stubEnv('GITHUB_ACTIONS', 'true');
      vi.stubEnv('GITHUB_EVENT_PATH', '/tmp/event.json');
      mockReadFile.mockResolvedValue(JSON.stringify(sampleGitHubEvent));

      const processor = new GitHubActionReviewProcessor({ postToGitHub: false });
      await processor.processFromEvent();

      expect(log.info).toHaveBeenCalledWith('Reading GitHub Actions event');
      expect(log.info).toHaveBeenCalledWith(
        'Processing GitHub Action PR review',
        expect.any(Object)
      );
      expect(log.info).toHaveBeenCalledWith('PR diff fetched successfully', expect.any(Object));
      expect(log.info).toHaveBeenCalledWith('Starting AI review', expect.any(Object));
      expect(log.info).toHaveBeenCalledWith('AI review completed', expect.any(Object));
      expect(log.info).toHaveBeenCalledWith('Review saved to database', expect.any(Object));
      expect(log.info).toHaveBeenCalledWith('GitHub Action PR review completed', expect.any(Object));
    });
  });

  describe('processPR - Multi-file with combined diff', () => {
    it('should combine patches with file markers for multi-file PRs', async () => {
      mockGetPRDiff.mockResolvedValue({
        success: true,
        data: {
          owner: 'octocat',
          repo: 'hello-world',
          pullNumber: 42,
          files: [
            {
              filename: 'src/components/Button.tsx',
              status: 'modified' as const,
              additions: 15,
              deletions: 3,
              changes: 18,
              patch: `@@ -10,5 +10,10 @@
  export const Button = () => {
+   const [loading, setLoading] = useState(false);
+   const handleClick = () => {
+     setLoading(true);
+     onClick();
+   };
    return <button {...props}>Click me</button>;
  }`,
            },
            {
              filename: 'src/styles/button.css',
              status: 'modified' as const,
              additions: 5,
              deletions: 2,
              changes: 7,
              patch: `@@ -1,3 +1,6 @@
  .button {
    padding: 8px 16px;
+   border-radius: 4px;
  }`,
            },
          ],
          totalAdditions: 20,
          totalDeletions: 5,
          totalChanges: 25,
        },
      });

      const processor = new GitHubActionReviewProcessor({ postToGitHub: false });
      const result = await processor.processPR(samplePRParams);

      expect(result.success).toBe(true);
      expect(mockReviewer.review).toHaveBeenCalledWith(
        expect.objectContaining({
          diff: expect.stringContaining('### src/components/Button.tsx'),
        })
      );
      expect(mockReviewer.review).toHaveBeenCalledWith(
        expect.objectContaining({
          diff: expect.stringContaining('### src/styles/button.css'),
        })
      );
    });
  });

  describe('processFromEvent - Author information extraction', () => {
    it('should use sender login and id for author info', async () => {
      vi.stubEnv('GITHUB_ACTIONS', 'true');
      vi.stubEnv('GITHUB_EVENT_PATH', '/tmp/event.json');
      mockReadFile.mockResolvedValue(JSON.stringify(sampleGitHubEvent));

      const processor = new GitHubActionReviewProcessor({ postToGitHub: false });
      await processor.processFromEvent();

      expect(mockPrismaReviewCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            authorId: '1',
            authorName: 'octocat',
          }),
        })
      );
    });

    it('should use github-action as fallback when no sender', async () => {
      vi.stubEnv('GITHUB_ACTIONS', 'true');
      vi.stubEnv('GITHUB_EVENT_PATH', '/tmp/event.json');
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          ...sampleGitHubEvent,
          sender: undefined,
        })
      );

      const processor = new GitHubActionReviewProcessor({ postToGitHub: false });
      const result = await processor.processFromEvent();

      expect(result.success).toBe(true);
      expect(mockPrismaReviewCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            authorId: 'github-action',
            authorName: 'GitHub Action',
          }),
        })
      );
    });
  });

  describe('processPR - Database save with comments', () => {
    it('should save all AI comments with correct line numbers', async () => {
      mockReviewer.review.mockResolvedValue({
        success: true,
        data: {
          summary: 'Good PR with minor suggestions',
          comments: [
            {
              line: 15,
              severity: 'SUGGESTION' as const,
              category: 'style' as const,
              comment: 'Variable name could be more descriptive',
              filePath: 'src/main.ts',
            },
            {
              line: 42,
              severity: 'CRITICAL' as const,
              category: 'security' as const,
              comment: 'Potential SQL injection vulnerability',
              suggestion: 'Use parameterized queries',
              filePath: 'src/db.ts',
            },
            {
              line: 8,
              severity: 'INFO' as const,
              category: 'documentation' as const,
              comment: 'Consider adding type annotations',
              filePath: 'src/types.ts',
            },
          ],
          approval: 'request_changes' as const,
          score: 6,
          model: 'claude-3-5-sonnet' as const,
          durationMs: 2000,
        },
      });

      const processor = new GitHubActionReviewProcessor({ postToGitHub: false });
      const result = await processor.processPR(samplePRParams);

      expect(result.success).toBe(true);
      expect(result.aiResult?.comments).toHaveLength(3);

      // Verify comments were saved with correct line numbers
      expect(mockPrismaReviewCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            comments: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({ lineStart: 15, severity: 'SUGGESTION' }),
                expect.objectContaining({ lineStart: 42, severity: 'CRITICAL' }),
                expect.objectContaining({ lineStart: 8, severity: 'INFO' }),
              ]),
            }),
          }),
        })
      );
    });
  });

  describe('processFromEvent - Duration tracking', () => {
    it('should track duration in result', async () => {
      vi.stubEnv('GITHUB_ACTIONS', 'true');
      vi.stubEnv('GITHUB_EVENT_PATH', '/tmp/event.json');
      mockReadFile.mockResolvedValue(JSON.stringify(sampleGitHubEvent));

      const processor = new GitHubActionReviewProcessor({ postToGitHub: false });
      const startTime = Date.now();
      const result = await processor.processFromEvent();
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.durationMs).toBeLessThanOrEqual(endTime - startTime + 100); // Allow small buffer
    });
  });

  describe('processPR - Comment filtering for GitHub post', () => {
    it('should only post comments with filePath and line', async () => {
      mockReviewer.review.mockResolvedValue({
        success: true,
        data: {
          ...sampleAIResult.data,
          comments: [
            {
              line: 10,
              severity: 'WARNING' as const,
              category: 'correctness' as const,
              comment: 'This has both filePath and line',
              filePath: 'src/file.ts',
            },
            {
              line: 20,
              severity: 'WARNING' as const,
              category: 'correctness' as const,
              comment: 'This has no filePath',
              // No filePath
            },
            {
              line: undefined,
              severity: 'WARNING' as const,
              category: 'correctness' as const,
              comment: 'This has line set to undefined',
              filePath: 'src/another.ts',
            },
          ],
        },
      });

      mockCreatePRReview.mockResolvedValue({ success: true, data: { id: 789 } });

      const processor = new GitHubActionReviewProcessor({ postToGitHub: true });
      const result = await processor.processPR(samplePRParams);

      expect(result.success).toBe(true);
      // Only the comment with both filePath and line should be posted
      expect(mockCreatePRReview).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          comments: expect.arrayContaining([
            expect.objectContaining({ line: 10 }),
          ]),
        })
      );
      // Verify only 1 comment was posted (the one with both path and line)
      const callArgs = mockCreatePRReview.mock.calls[0][1];
      expect(callArgs.comments).toHaveLength(1);
    });
  });
});
