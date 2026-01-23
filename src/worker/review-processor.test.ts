/**
 * Tests for Review Processor Module
 */

import {
  ReviewProcessor,
  createReviewProcessor,
  createDryRunProcessor,
  processReview,
  type ProcessPRParams,
  type StatusCallback,
} from './review-processor';

// Mock dependencies
jest.mock('../lib/github/pr-diff', () => ({
  getPRDiff: jest.fn(),
}));

jest.mock('../lib/ai/reviewer', () => ({
  createReviewerFromEnv: jest.fn(() => ({
    review: jest.fn(),
    reviewPR: jest.fn(),
  })),
  AIReviewer: jest.fn(),
}));

jest.mock('../lib/prisma', () => ({
  prisma: {
    review: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../lib/remote-log', () => ({
  log: {
    debug: jest.fn().mockResolvedValue(undefined),
    info: jest.fn().mockResolvedValue(undefined),
    warn: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
  },
}));

// Import mocked modules
import { getPRDiff } from '../lib/github/pr-diff';
import { createReviewerFromEnv } from '../lib/ai/reviewer';
import { prisma } from '../lib/prisma';
import { log } from '../lib/remote-log';

// Type assertions for mocks
const mockGetPRDiff = getPRDiff as jest.MockedFunction<typeof getPRDiff>;
const mockCreateReviewerFromEnv = createReviewerFromEnv as jest.MockedFunction<typeof createReviewerFromEnv>;
const mockPrismaReviewCreate = prisma.review.create as jest.MockedFunction<typeof prisma.review.create>;

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
  let mockReviewer: { review: jest.MockedFunction<any>; reviewPR: jest.MockedFunction<any> };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    mockReviewer = {
      review: jest.fn().mockResolvedValue(sampleAIResult),
      reviewPR: jest.fn().mockResolvedValue(sampleAIResult),
    };

    mockCreateReviewerFromEnv.mockReturnValue(mockReviewer as any);
    mockGetPRDiff.mockResolvedValue(sampleDiffResult as any);
    mockPrismaReviewCreate.mockResolvedValue(sampleReviewRecord as any);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('constructor', () => {
    it('should create processor with default configuration', () => {
      const processor = new ReviewProcessor();
      expect(processor).toBeInstanceOf(ReviewProcessor);
      expect(mockCreateReviewerFromEnv).toHaveBeenCalled();
    });

    it('should create processor with custom AI reviewer', () => {
      const customReviewer = {
        review: jest.fn(),
        reviewPR: jest.fn(),
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
      const statusCallback: StatusCallback = jest.fn();

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

      const progressCallback = jest.fn();
      await processor.processBatch(prs, progressCallback);

      expect(progressCallback).toHaveBeenCalledTimes(2);
      expect(progressCallback).toHaveBeenCalledWith(1, 2, expect.any(Object));
      expect(progressCallback).toHaveBeenCalledWith(2, 2, expect.any(Object));
    });

    it('should continue processing even if one PR fails', async () => {
      mockGetPRDiff.mockReset();
      mockGetPRDiff
        .mockResolvedValueOnce(sampleDiffResult as any)
        .mockResolvedValueOnce({ success: false, error: 'Not found' } as any)
        .mockResolvedValueOnce({ success: false, error: 'Not found' } as any)
        .mockResolvedValueOnce({ success: false, error: 'Not found' } as any)
        .mockResolvedValueOnce(sampleDiffResult as any);

      const processor = new ReviewProcessor({ maxRetries: 3 });
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
});

describe('Factory Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateReviewerFromEnv.mockReturnValue({
      review: jest.fn(),
      reviewPR: jest.fn(),
    } as any);
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
    jest.clearAllMocks();

    const mockReviewer = {
      review: jest.fn().mockResolvedValue(sampleAIResult),
      reviewPR: jest.fn(),
    };

    mockCreateReviewerFromEnv.mockReturnValue(mockReviewer as any);
    mockGetPRDiff.mockResolvedValue(sampleDiffResult as any);
    mockPrismaReviewCreate.mockResolvedValue(sampleReviewRecord as any);
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
