/**
 * Tests for Test Report Trigger Module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  triggerTestReport,
  triggerTestReportAsync,
  isReviewCompleted,
  type TriggerTestReportParams,
  type TriggerTestReportResult,
} from '../trigger';

// Mock dependencies
vi.mock('../../prisma', () => ({
  prisma: {
    review: {
      findUnique: vi.fn(),
    },
    testReport: {
      findFirst: vi.fn(),
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

vi.mock('../collector', () => ({
  collectTestReportContext: vi.fn(),
}));

vi.mock('../generator', () => ({
  createTestReportGeneratorFromEnv: vi.fn(() => ({
    generate: vi.fn(),
  })),
}));

// Import mocked modules
import { prisma } from '../../prisma';
import { log } from '../../remote-log';
import { collectTestReportContext } from '../collector';

// Type assertions for mocks
const mockPrismaReviewFindUnique = prisma.review.findUnique as ReturnType<typeof vi.fn>;
const mockPrismaTestReportFindFirst = prisma.testReport.findFirst as ReturnType<typeof vi.fn>;
const mockPrismaTestReportCreate = prisma.testReport.create as ReturnType<typeof vi.fn>;
const mockCollectTestReportContext = collectTestReportContext as ReturnType<typeof vi.fn>;

describe('Test Report Trigger Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('isReviewCompleted', () => {
    it('should return true for APPROVED status', () => {
      expect(isReviewCompleted('APPROVED')).toBe(true);
    });

    it('should return true for REJECTED status', () => {
      expect(isReviewCompleted('REJECTED')).toBe(true);
    });

    it('should return true for CLOSED status', () => {
      expect(isReviewCompleted('CLOSED')).toBe(true);
    });

    it('should return false for PENDING status', () => {
      expect(isReviewCompleted('PENDING')).toBe(false);
    });

    it('should return false for IN_PROGRESS status', () => {
      expect(isReviewCompleted('IN_PROGRESS')).toBe(false);
    });

    it('should return false for CHANGES_REQUESTED status', () => {
      expect(isReviewCompleted('CHANGES_REQUESTED')).toBe(false);
    });

    it('should return false for unknown status', () => {
      expect(isReviewCompleted('UNKNOWN')).toBe(false);
    });
  });

  describe('triggerTestReport', () => {
    const mockReview = {
      id: 'review-123',
      title: 'Test Review',
      description: 'Test description',
      status: 'APPROVED',
      sourceType: 'pull_request',
      sourceId: 'owner/repo#42',
      sourceUrl: 'https://github.com/owner/repo/pull/42',
      authorId: 'user-123',
      authorName: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockContextResult = {
      success: true,
      data: {
        execution: mockReview,
        plan: {
          id: 'review-123',
          name: 'Test Review',
          description: 'Test description',
          status: 'APPROVED',
          repositoryName: 'owner/repo',
          repositoryUrl: 'https://github.com/owner/repo/pull/42',
          branchName: null,
          commitSha: null,
          pullRequestId: '42',
          pullRequestUrl: 'https://github.com/owner/repo/pull/42',
        },
        tasks: [
          {
            taskId: 'task-1',
            title: 'Task 1',
            status: 'completed' as const,
            assigneeId: null,
            assigneeName: null,
            completedAt: new Date(),
            failedAt: null,
          },
        ],
        conversation: {
          totalComments: 2,
          resolvedComments: 1,
          unresolvedComments: 1,
          comments: [],
        },
        prDiff: null,
        collectedAt: new Date(),
      },
    };

    const mockTestReport = {
      id: 'report-123',
      title: 'Test Review - Test Report',
      description: 'Test description',
      recommendation: 'MERGE',
      executionId: 'review-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return error when review not found', async () => {
      mockPrismaReviewFindUnique.mockResolvedValue(null);

      const result = await triggerTestReport({ reviewId: 'unknown-id' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Review not found');
    });

    it('should return error when review is not completed', async () => {
      mockPrismaReviewFindUnique.mockResolvedValue({
        ...mockReview,
        status: 'IN_PROGRESS',
      });

      const result = await triggerTestReport({ reviewId: 'review-123' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Review not completed');
    });

    it('should skip when test report already exists', async () => {
      mockPrismaReviewFindUnique.mockResolvedValue(mockReview);
      mockPrismaTestReportFindFirst.mockResolvedValue(mockTestReport);

      const result = await triggerTestReport({ reviewId: 'review-123' });

      expect(result.success).toBe(true);
      expect(result.reportId).toBe('report-123');
      expect(mockPrismaTestReportCreate).not.toHaveBeenCalled();
    });

    it('should create test report for APPROVED review', async () => {
      mockPrismaReviewFindUnique.mockResolvedValue(mockReview);
      mockPrismaTestReportFindFirst.mockResolvedValue(null);
      mockCollectTestReportContext.mockResolvedValue(mockContextResult);
      mockPrismaTestReportCreate.mockResolvedValue(mockTestReport);

      const result = await triggerTestReport({ reviewId: 'review-123' });

      expect(result.success).toBe(true);
      expect(result.reportId).toBe('report-123');
      expect(mockPrismaTestReportCreate).toHaveBeenCalled();
    });

    it('should create test report with MERGE recommendation for APPROVED status', async () => {
      mockPrismaReviewFindUnique.mockResolvedValue(mockReview);
      mockPrismaTestReportFindFirst.mockResolvedValue(null);
      mockCollectTestReportContext.mockResolvedValue(mockContextResult);
      mockPrismaTestReportCreate.mockResolvedValue(mockTestReport);

      await triggerTestReport({ reviewId: 'review-123' });

      expect(mockPrismaTestReportCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recommendation: 'MERGE',
          }),
        })
      );
    });

    it('should create test report with REJECT recommendation for REJECTED status', async () => {
      mockPrismaReviewFindUnique.mockResolvedValue({
        ...mockReview,
        status: 'REJECTED',
      });
      mockPrismaTestReportFindFirst.mockResolvedValue(null);
      mockCollectTestReportContext.mockResolvedValue(mockContextResult);
      mockPrismaTestReportCreate.mockResolvedValue(mockTestReport);

      await triggerTestReport({ reviewId: 'review-123' });

      expect(mockPrismaTestReportCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recommendation: 'REJECT',
          }),
        })
      );
    });

    it('should create test report with NEEDS_CHANGES recommendation for CLOSED status', async () => {
      mockPrismaReviewFindUnique.mockResolvedValue({
        ...mockReview,
        status: 'CLOSED',
      });
      mockPrismaTestReportFindFirst.mockResolvedValue(null);
      mockCollectTestReportContext.mockResolvedValue(mockContextResult);
      mockPrismaTestReportCreate.mockResolvedValue(mockTestReport);

      await triggerTestReport({ reviewId: 'review-123' });

      expect(mockPrismaTestReportCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recommendation: 'NEEDS_CHANGES',
          }),
        })
      );
    });

    it('should handle context collection failure', async () => {
      mockPrismaReviewFindUnique.mockResolvedValue(mockReview);
      mockPrismaTestReportFindFirst.mockResolvedValue(null);
      mockCollectTestReportContext.mockResolvedValue({
        success: false,
        error: 'Failed to collect context',
      });

      const result = await triggerTestReport({ reviewId: 'review-123' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to collect context');
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaReviewFindUnique.mockRejectedValue(new Error('Database error'));

      const result = await triggerTestReport({ reviewId: 'review-123' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should use custom title when provided', async () => {
      mockPrismaReviewFindUnique.mockResolvedValue(mockReview);
      mockPrismaTestReportFindFirst.mockResolvedValue(null);
      mockCollectTestReportContext.mockResolvedValue(mockContextResult);
      mockPrismaTestReportCreate.mockResolvedValue(mockTestReport);

      await triggerTestReport({
        reviewId: 'review-123',
        title: 'Custom Report Title',
      });

      expect(mockPrismaTestReportCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Custom Report Title',
          }),
        })
      );
    });
  });

  describe('triggerTestReportAsync', () => {
    it('should not throw errors', () => {
      mockPrismaReviewFindUnique.mockResolvedValue(null);

      // Should not throw - function is fire-and-forget
      expect(() => {
        triggerTestReportAsync({ reviewId: 'unknown-id' });
      }).not.toThrow();
    });

    it('should call triggerTestReport and catch errors', () => {
      mockPrismaReviewFindUnique.mockResolvedValue({
        id: 'review-123',
        status: 'APPROVED',
      } as any);
      mockPrismaTestReportFindFirst.mockResolvedValue(null);
      mockCollectTestReportContext.mockResolvedValue({
        success: true,
        data: {
          execution: null,
          plan: null,
          tasks: [],
          conversation: { totalComments: 0, resolvedComments: 0, unresolvedComments: 0, comments: [] },
          prDiff: null,
          collectedAt: new Date(),
        },
      });

      // Should not throw even if there are errors - function is fire-and-forget
      expect(() => {
        triggerTestReportAsync({ reviewId: 'review-123' });
      }).not.toThrow();
    });
  });
});