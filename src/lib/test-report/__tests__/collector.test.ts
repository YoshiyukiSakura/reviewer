/**
 * Tests for Test Report Data Collector Module
 *
 * Note: We test only exported functions. Private helper functions are tested
 * indirectly through the public API tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  collectTestReportContext,
  createTestReportFromContext,
  type TestReportContext,
} from '../collector';

// Mock dependencies
vi.mock('../../prisma', () => ({
  prisma: {
    review: {
      findUnique: vi.fn(),
    },
    reviewComment: {
      findMany: vi.fn(),
    },
    testReport: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../../remote-log', () => ({
  log: {
    debug: vi.fn().mockResolvedValue(undefined),
    info: vi.fn().mockResolvedValue(undefined),
    warn: vi.fn().mockResolvedValue(undefined),
    error: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../github/pr-diff', () => ({
  getPRDiff: vi.fn(),
}));

// Import mocked modules
import { prisma } from '../../prisma';
import { getPRDiff } from '../../github/pr-diff';

// Type assertions for mocks
const mockPrismaReviewFindUnique = prisma.review.findUnique as ReturnType<typeof vi.fn>;
const mockPrismaReviewCommentFindMany = prisma.reviewComment.findMany as ReturnType<typeof vi.fn>;
const mockPrismaTestReportCreate = prisma.testReport.create as ReturnType<typeof vi.fn>;
const mockGetPRDiff = getPRDiff as ReturnType<typeof vi.fn>;

// ========== Helper Functions ==========

function createMockReview(overrides: Record<string, unknown> = {}) {
  return {
    id: 'review-123',
    title: 'Test Review Title',
    description: 'Test review description',
    status: 'APPROVED',
    sourceType: 'pull_request',
    sourceId: 'owner/repo#42',
    sourceUrl: 'https://github.com/owner/repo/pull/42',
    authorId: 'user-123',
    authorName: 'Test User',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T12:00:00Z'),
    ...overrides,
  };
}

function createMockComments() {
  return [
    {
      id: 'comment-1',
      content: 'Please fix this issue',
      authorId: 'user-456',
      authorName: 'Reviewer A',
      filePath: 'src/utils.ts',
      lineStart: 42,
      isResolved: true,
      severity: 'WARNING',
      createdAt: new Date('2024-01-15T10:30:00Z'),
      updatedAt: new Date('2024-01-15T11:00:00Z'),
    },
    {
      id: 'comment-2',
      content: 'Good improvement',
      authorId: 'user-789',
      authorName: 'Reviewer B',
      filePath: 'src/utils.ts',
      lineStart: 100,
      isResolved: false,
      severity: 'INFO',
      createdAt: new Date('2024-01-15T11:00:00Z'),
      updatedAt: new Date('2024-01-15T11:00:00Z'),
    },
    {
      id: 'comment-3',
      content: 'Security concern here',
      authorId: 'user-456',
      authorName: 'Reviewer A',
      filePath: 'src/auth.ts',
      lineStart: 15,
      isResolved: false,
      severity: 'CRITICAL',
      createdAt: new Date('2024-01-15T11:30:00Z'),
      updatedAt: new Date('2024-01-15T11:30:00Z'),
    },
  ];
}

function createMockPRDiffResult() {
  return {
    success: true,
    data: {
      owner: 'owner',
      repo: 'repo',
      pullNumber: 42,
      files: [
        {
          filename: 'src/utils.ts',
          status: 'modified',
          additions: 25,
          deletions: 10,
          changes: 35,
          patch: '@@ -10,10 +10,15 @@\n+  new line',
        },
        {
          filename: 'src/auth.ts',
          status: 'added',
          additions: 50,
          deletions: 0,
          changes: 50,
          patch: undefined,
        },
      ],
      totalAdditions: 75,
      totalDeletions: 10,
      totalChanges: 85,
    },
  };
}

describe('Test Report Collector Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ========== collectTestReportContext Tests ==========

  describe('collectTestReportContext', () => {
    it('should successfully collect all context data', async () => {
      const mockReview = createMockReview();
      const comments = createMockComments();
      const mockDiffResult = createMockPRDiffResult();

      mockPrismaReviewFindUnique.mockResolvedValue(mockReview);
      mockPrismaReviewCommentFindMany.mockResolvedValue(comments);
      mockGetPRDiff.mockResolvedValue(mockDiffResult);

      const result = await collectTestReportContext({
        reviewId: 'review-123',
        prParams: {
          owner: 'owner',
          repo: 'repo',
          pullNumber: 42,
        },
      });

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data?.execution?.id).toBe('review-123');
      expect(result.data?.plan?.repositoryName).toBe('owner/repo');
      expect(result.data?.tasks).toHaveLength(2); // Two unique file paths
      expect(result.data?.conversation.totalComments).toBe(3);
      expect(result.data?.prDiff?.files).toHaveLength(2);
      expect(result.data?.collectedAt).toBeInstanceOf(Date);
    });

    it('should set execution to null when review not found', async () => {
      mockPrismaReviewFindUnique.mockResolvedValue(null);
      mockPrismaReviewCommentFindMany.mockResolvedValue([]);
      mockGetPRDiff.mockResolvedValue({ success: true, data: null });

      const result = await collectTestReportContext({
        reviewId: 'unknown-id',
      });

      expect(result.success).toBe(true);
      expect(result.data?.execution).toBeNull();
      expect(result.data?.tasks).toEqual([]);
      expect(result.data?.conversation.totalComments).toBe(0);
    });

    it('should skip PR diff collection when no params provided', async () => {
      const mockReview = createMockReview();
      mockPrismaReviewFindUnique.mockResolvedValue(mockReview);
      mockPrismaReviewCommentFindMany.mockResolvedValue([]);

      const result = await collectTestReportContext({
        reviewId: 'review-123',
      });

      expect(result.success).toBe(true);
      expect(result.data?.prDiff).toBeNull();
      expect(mockGetPRDiff).not.toHaveBeenCalled();
    });

    it('should return null prDiff when getPRDiff fails', async () => {
      const mockReview = createMockReview();
      mockPrismaReviewFindUnique.mockResolvedValue(mockReview);
      mockPrismaReviewCommentFindMany.mockResolvedValue([]);
      mockGetPRDiff.mockResolvedValue({
        success: false,
        error: 'Failed to fetch',
      });

      const result = await collectTestReportContext({
        reviewId: 'review-123',
        prParams: {
          owner: 'owner',
          repo: 'repo',
          pullNumber: 42,
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.prDiff).toBeNull();
    });

    it('should return error when task collection fails', async () => {
      const mockReview = createMockReview();
      mockPrismaReviewFindUnique.mockResolvedValue(mockReview);
      mockPrismaReviewCommentFindMany.mockRejectedValue(new Error('Task collection failed'));
      mockGetPRDiff.mockResolvedValue({ success: true, data: null });

      const result = await collectTestReportContext({
        reviewId: 'review-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Task collection failed');
    });

    it('should return error when conversation collection fails', async () => {
      const mockReview = createMockReview();
      mockPrismaReviewFindUnique.mockResolvedValue(mockReview);
      mockPrismaReviewCommentFindMany
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error('Conversation collection failed'));
      mockGetPRDiff.mockResolvedValue({ success: true, data: null });

      const result = await collectTestReportContext({
        reviewId: 'review-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Conversation collection failed');
    });

    it('should collect data in parallel for efficiency', async () => {
      const mockReview = createMockReview();
      mockPrismaReviewFindUnique.mockResolvedValue(mockReview);
      mockPrismaReviewCommentFindMany.mockResolvedValue([]);
      mockGetPRDiff.mockResolvedValue({ success: true, data: null });

      await collectTestReportContext({
        reviewId: 'review-123',
        prParams: {
          owner: 'owner',
          repo: 'repo',
          pullNumber: 42,
        },
      });

      // All mocks should be called
      expect(mockPrismaReviewFindUnique).toHaveBeenCalled();
      expect(mockPrismaReviewCommentFindMany).toHaveBeenCalled();
      expect(mockGetPRDiff).toHaveBeenCalled();
    });

    it('should group comments by file path into tasks', async () => {
      const mockReview = createMockReview();
      const comments = createMockComments();

      mockPrismaReviewFindUnique.mockResolvedValue(mockReview);
      mockPrismaReviewCommentFindMany.mockResolvedValue(comments);
      mockGetPRDiff.mockResolvedValue({ success: true, data: null });

      const result = await collectTestReportContext({
        reviewId: 'review-123',
      });

      expect(result.success).toBe(true);
      expect(result.data?.tasks).toHaveLength(2);
      expect(result.data?.tasks.some((t) => t.title.includes('utils.ts'))).toBe(true);
      expect(result.data?.tasks.some((t) => t.title.includes('auth.ts'))).toBe(true);
    });

    it('should correctly calculate conversation statistics', async () => {
      const mockReview = createMockReview();
      const comments = createMockComments();

      mockPrismaReviewFindUnique.mockResolvedValue(mockReview);
      mockPrismaReviewCommentFindMany.mockResolvedValue(comments);
      mockGetPRDiff.mockResolvedValue({ success: true, data: null });

      const result = await collectTestReportContext({
        reviewId: 'review-123',
      });

      expect(result.success).toBe(true);
      expect(result.data?.conversation.totalComments).toBe(3);
      expect(result.data?.conversation.resolvedComments).toBe(1);
      expect(result.data?.conversation.unresolvedComments).toBe(2);
    });

    it('should handle repository name extraction from various URL formats', async () => {
      // Note: The URL parsing extracts the first two path segments after the hostname
      const testCases = [
        { url: 'https://github.com/owner/repo/pull/42', expected: 'owner/repo' },
        { url: 'https://gitlab.com/group/project/-/merge_requests/123', expected: 'group/project' },
        { url: 'https://bitbucket.org/team/project/pull-requests/1', expected: 'team/project' },
        { url: 'invalid-url', expected: null },
        { url: null, expected: null },
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();
        mockPrismaReviewFindUnique.mockResolvedValue(
          createMockReview({ sourceUrl: testCase.url })
        );
        mockPrismaReviewCommentFindMany.mockResolvedValue([]);
        mockGetPRDiff.mockResolvedValue({ success: true, data: null });

        const result = await collectTestReportContext({
          reviewId: 'review-123',
        });

        expect(result.data?.plan?.repositoryName).toBe(testCase.expected);
      }
    });
  });

  // ========== createTestReportFromContext Tests ==========

  describe('createTestReportFromContext', () => {
    it('should create test report successfully', async () => {
      const context: TestReportContext = {
        execution: createMockReview() as any,
        plan: {
          id: 'review-123',
          name: 'Test Review',
          description: 'Test description',
          status: 'APPROVED',
          repositoryName: 'owner/repo',
          repositoryUrl: 'https://github.com/owner/repo/pull/42',
          branchName: 'main',
          commitSha: 'abc123def456',
          pullRequestId: '42',
          pullRequestUrl: 'https://github.com/owner/repo/pull/42',
        },
        tasks: [
          {
            taskId: 'task-1',
            title: 'Task 1',
            status: 'completed',
            assigneeId: 'user-1',
            assigneeName: 'User 1',
            completedAt: new Date(),
            failedAt: null,
          },
          {
            taskId: 'task-2',
            title: 'Task 2',
            status: 'in_progress',
            assigneeId: 'user-2',
            assigneeName: 'User 2',
            completedAt: null,
            failedAt: null,
          },
        ],
        conversation: {
          totalComments: 5,
          resolvedComments: 3,
          unresolvedComments: 2,
          comments: [],
        },
        prDiff: null,
        collectedAt: new Date(),
      };

      const mockReport = {
        id: 'report-123',
        title: 'Test Report',
        recommendation: 'MERGE',
        totalTasks: 2,
        completedTasks: 1,
        failedTasks: 0,
        skippedTasks: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaTestReportCreate.mockResolvedValue(mockReport);

      const result = await createTestReportFromContext(context, 'Test Report', 'MERGE');

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data?.id).toBe('report-123');
      expect(mockPrismaTestReportCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Test Report',
          recommendation: 'MERGE',
          totalTasks: 2,
          completedTasks: 1,
          repositoryName: 'owner/repo',
          commitSha: 'abc123def456',
        }),
      });
    });

    it('should calculate task statistics correctly', async () => {
      const context: TestReportContext = {
        execution: createMockReview() as any,
        plan: null,
        tasks: [
          { taskId: 't1', title: 'T1', status: 'completed', assigneeId: null, assigneeName: null, completedAt: new Date(), failedAt: null },
          { taskId: 't2', title: 'T2', status: 'completed', assigneeId: null, assigneeName: null, completedAt: new Date(), failedAt: null },
          { taskId: 't3', title: 'T3', status: 'failed', assigneeId: null, assigneeName: null, completedAt: null, failedAt: new Date() },
          { taskId: 't4', title: 'T4', status: 'skipped', assigneeId: null, assigneeName: null, completedAt: null, failedAt: null },
          { taskId: 't5', title: 'T5', status: 'pending', assigneeId: null, assigneeName: null, completedAt: null, failedAt: null },
        ],
        conversation: {
          totalComments: 3,
          resolvedComments: 2,
          unresolvedComments: 1,
          comments: [],
        },
        prDiff: null,
        collectedAt: new Date(),
      };

      const mockReport = {
        id: 'report-123',
        title: 'Test',
        recommendation: 'MERGE' as const,
        totalTasks: 5,
        completedTasks: 2,
        failedTasks: 1,
        skippedTasks: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaTestReportCreate.mockResolvedValue(mockReport);

      const result = await createTestReportFromContext(context, 'Test', 'MERGE');

      expect(result.success).toBe(true);
      expect(mockPrismaTestReportCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          totalTasks: 5,
          completedTasks: 2,
          failedTasks: 1,
          skippedTasks: 1,
        }),
      });
    });

    it('should handle null execution gracefully', async () => {
      const context: TestReportContext = {
        execution: null,
        plan: {
          id: 'review-123',
          name: 'Test',
          description: null,
          status: 'APPROVED',
          repositoryName: 'owner/repo',
          repositoryUrl: null,
          branchName: null,
          commitSha: null,
          pullRequestId: null,
          pullRequestUrl: null,
        },
        tasks: [],
        conversation: {
          totalComments: 0,
          resolvedComments: 0,
          unresolvedComments: 0,
          comments: [],
        },
        prDiff: null,
        collectedAt: new Date(),
      };

      const mockReport = {
        id: 'report-123',
        title: 'Test',
        recommendation: 'MERGE' as const,
        authorId: null,
        authorName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaTestReportCreate.mockResolvedValue(mockReport);

      const result = await createTestReportFromContext(context, 'Test', 'MERGE');

      expect(result.success).toBe(true);
      expect(mockPrismaTestReportCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          authorId: null,
          authorName: null,
        }),
      });
    });

    it('should generate summary from conversation when comments exist', async () => {
      const context: TestReportContext = {
        execution: createMockReview() as any,
        plan: null,
        tasks: [],
        conversation: {
          totalComments: 5,
          resolvedComments: 3,
          unresolvedComments: 2,
          comments: [],
        },
        prDiff: null,
        collectedAt: new Date(),
      };

      mockPrismaTestReportCreate.mockResolvedValue({
        id: 'report-123',
        title: 'Test',
        recommendation: 'MERGE' as const,
        summary: 'Collected 5 comments with 3 resolved',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await createTestReportFromContext(context, 'Test', 'MERGE');

      expect(mockPrismaTestReportCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          summary: 'Collected 5 comments with 3 resolved',
        }),
      });
    });

    it('should not generate summary when no comments', async () => {
      const context: TestReportContext = {
        execution: createMockReview() as any,
        plan: null,
        tasks: [],
        conversation: {
          totalComments: 0,
          resolvedComments: 0,
          unresolvedComments: 0,
          comments: [],
        },
        prDiff: null,
        collectedAt: new Date(),
      };

      mockPrismaTestReportCreate.mockResolvedValue({
        id: 'report-123',
        title: 'Test',
        recommendation: 'MERGE' as const,
        summary: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await createTestReportFromContext(context, 'Test', 'MERGE');

      expect(mockPrismaTestReportCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          summary: null,
        }),
      });
    });

    it('should include all plan information in report', async () => {
      const context: TestReportContext = {
        execution: createMockReview() as any,
        plan: {
          id: 'review-123',
          name: 'Feature Implementation',
          description: 'New feature for dashboard',
          status: 'APPROVED',
          repositoryName: 'company/project',
          repositoryUrl: 'https://github.com/company/project/pull/42',
          branchName: 'feature/new-dashboard',
          commitSha: 'abc123def456789',
          pullRequestId: '42',
          pullRequestUrl: 'https://github.com/company/project/pull/42',
        },
        tasks: [],
        conversation: { totalComments: 0, resolvedComments: 0, unresolvedComments: 0, comments: [] },
        prDiff: null,
        collectedAt: new Date(),
      };

      mockPrismaTestReportCreate.mockResolvedValue({
        id: 'report-123',
        title: 'Test',
        recommendation: 'MERGE' as const,
        repositoryName: 'company/project',
        repositoryUrl: 'https://github.com/company/project/pull/42',
        branchName: 'feature/new-dashboard',
        commitSha: 'abc123def456789',
        pullRequestId: '42',
        pullRequestUrl: 'https://github.com/company/project/pull/42',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await createTestReportFromContext(context, 'Test', 'MERGE');

      expect(mockPrismaTestReportCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          repositoryName: 'company/project',
          branchName: 'feature/new-dashboard',
          commitSha: 'abc123def456789',
          pullRequestId: '42',
        }),
      });
    });

    it('should handle database errors gracefully', async () => {
      const context: TestReportContext = {
        execution: createMockReview() as any,
        plan: null,
        tasks: [],
        conversation: {
          totalComments: 0,
          resolvedComments: 0,
          unresolvedComments: 0,
          comments: [],
        },
        prDiff: null,
        collectedAt: new Date(),
      };

      mockPrismaTestReportCreate.mockRejectedValue(new Error('Database error'));

      const result = await createTestReportFromContext(context, 'Test', 'MERGE');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });

    it('should include prDiff data when available', async () => {
      const context: TestReportContext = {
        execution: createMockReview() as any,
        plan: null,
        tasks: [],
        conversation: { totalComments: 0, resolvedComments: 0, unresolvedComments: 0, comments: [] },
        prDiff: {
          owner: 'owner',
          repo: 'repo',
          pullNumber: 42,
          files: [
            { filename: 'src/main.ts', status: 'modified', additions: 100, deletions: 50, changes: 150, patch: '...' },
          ],
          totalAdditions: 100,
          totalDeletions: 50,
          totalChanges: 150,
        },
        collectedAt: new Date(),
      };

      // The prDiff data is used by the generator, not directly stored
      // We just verify the function handles it without error
      mockPrismaTestReportCreate.mockResolvedValue({
        id: 'report-123',
        title: 'Test',
        recommendation: 'MERGE' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await createTestReportFromContext(context, 'Test', 'MERGE');

      expect(result.success).toBe(true);
    });
  });
});