/**
 * Integration Tests for Test Reports API
 *
 * This test file covers key API endpoints for test reports:
 * 1. Listing test reports with pagination
 * 2. Retrieving single test report
 * 3. Deleting test reports
 * 4. Basic validation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { verifyToken, type TokenPayload } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  verifyToken: vi.fn(),
  signToken: vi.fn(),
  decodeToken: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    review: {
      findUnique: vi.fn(),
    },
    testReport: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('@/lib/remote-log', () => ({
  log: {
    debug: vi.fn().mockResolvedValue(undefined),
    info: vi.fn().mockResolvedValue(undefined),
    warn: vi.fn().mockResolvedValue(undefined),
    error: vi.fn().mockResolvedValue(undefined),
  },
}));

// Import mocked modules
import { prisma as mockPrisma } from '@/lib/prisma';
import { verifyToken as mockVerifyToken } from '@/lib/auth';

// Type assertions
const mockPrismaTestReportFindMany = mockPrisma.testReport.findMany as ReturnType<typeof vi.fn>;
const mockPrismaTestReportFindUnique = mockPrisma.testReport.findUnique as ReturnType<typeof vi.fn>;
const mockPrismaTestReportDelete = mockPrisma.testReport.delete as ReturnType<typeof vi.fn>;
const mockPrismaTestReportCount = mockPrisma.testReport.count as ReturnType<typeof vi.fn>;
const mockVerifyTokenFn = mockVerifyToken as ReturnType<typeof vi.fn>;

// ========== Helper Functions ==========

function createMockRequest(url: string, options: RequestInit = {}): Request {
  return new Request(`http://localhost${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

function createMockTokenPayload(overrides: Partial<TokenPayload> = {}): TokenPayload {
  return {
    userId: 'user-123',
    email: 'test@example.com',
    ...overrides,
  };
}

function createMockTestReport(overrides: Record<string, unknown> = {}) {
  return {
    id: 'report-123',
    title: 'Test Report',
    description: 'Generated test report',
    recommendation: 'MERGE',
    summary: 'Overall summary',
    overallAnalysis: 'Detailed analysis',
    score: 85,
    maxScore: 100,
    recommendationReason: 'Ready for merge',
    acceptanceSuggestion: 'Approve and merge',
    keyFindings: ['Finding 1'],
    concerns: ['Concern 1'],
    positives: ['Positive 1'],
    suggestions: ['Suggestion 1'],
    testDuration: 3600,
    testRunner: 'Jest',
    repositoryName: 'owner/repo',
    repositoryUrl: 'https://github.com/owner/repo',
    branchName: 'main',
    commitSha: 'abc123def456',
    pullRequestId: '42',
    pullRequestUrl: 'https://github.com/owner/repo/pull/42',
    totalTasks: 5,
    completedTasks: 4,
    failedTasks: 1,
    skippedTasks: 0,
    authorId: 'user-123',
    authorName: 'Test User',
    executionId: 'review-123',
    executedAt: new Date('2024-01-15T12:00:00Z'),
    createdAt: new Date('2024-01-15T12:00:00Z'),
    updatedAt: new Date('2024-01-15T12:00:00Z'),
    ...overrides,
  };
}

describe('Test Reports API Integration Tests', () => {
  const mockUserPayload = createMockTokenPayload();

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyTokenFn.mockResolvedValue({ valid: true, payload: mockUserPayload });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ========== GET /api/test-reports Tests ==========

  describe('GET /api/test-reports', () => {
    it('should return paginated test reports', async () => {
      const mockReports = [
        createMockTestReport({ id: 'report-1', title: 'Report 1' }),
        createMockTestReport({ id: 'report-2', title: 'Report 2' }),
      ];

      mockPrismaTestReportFindMany.mockResolvedValue(mockReports);
      mockPrismaTestReportCount.mockResolvedValue(2);

      const { GET } = await import('../test-reports/route');
      const request = createMockRequest('/api/test-reports?page=1&pageSize=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(2);
      expect(data.total).toBe(2);
      expect(data.page).toBe(1);
      expect(data.pageSize).toBe(10);
      expect(data.totalPages).toBe(1);
    });

    it('should filter by recommendation', async () => {
      mockPrismaTestReportFindMany.mockResolvedValue([
        createMockTestReport({ id: 'report-1', recommendation: 'MERGE' }),
      ]);
      mockPrismaTestReportCount.mockResolvedValue(1);

      const { GET } = await import('../test-reports/route');
      const request = createMockRequest('/api/test-reports?recommendation=MERGE');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrismaTestReportFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ recommendation: 'MERGE' }),
        })
      );
    });

    it('should filter by authorId', async () => {
      mockPrismaTestReportFindMany.mockResolvedValue([]);
      mockPrismaTestReportCount.mockResolvedValue(0);

      const { GET } = await import('../test-reports/route');
      const request = createMockRequest('/api/test-reports?authorId=user-123');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrismaTestReportFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ authorId: 'user-123' }),
        })
      );
    });

    it('should filter by executionId', async () => {
      mockPrismaTestReportFindMany.mockResolvedValue([]);
      mockPrismaTestReportCount.mockResolvedValue(0);

      const { GET } = await import('../test-reports/route');
      const request = createMockRequest('/api/test-reports?executionId=review-123');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrismaTestReportFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ executionId: 'review-123' }),
        })
      );
    });

    it('should handle empty result', async () => {
      mockPrismaTestReportFindMany.mockResolvedValue([]);
      mockPrismaTestReportCount.mockResolvedValue(0);

      const { GET } = await import('../test-reports/route');
      const request = createMockRequest('/api/test-reports');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toEqual([]);
      expect(data.total).toBe(0);
    });

    it('should calculate pagination correctly', async () => {
      mockPrismaTestReportFindMany.mockResolvedValue([
        createMockTestReport({ id: 'report-11' }),
        createMockTestReport({ id: 'report-12' }),
      ]);
      mockPrismaTestReportCount.mockResolvedValue(25);

      const { GET } = await import('../test-reports/route');
      const request = createMockRequest('/api/test-reports?page=2&pageSize=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.page).toBe(2);
      expect(data.pageSize).toBe(10);
      expect(data.totalPages).toBe(3);
    });
  });

  // ========== GET /api/test-reports/[id] Tests ==========

  describe('GET /api/test-reports/[id]', () => {
    it('should return test report when found', async () => {
      const mockReport = createMockTestReport();
      mockPrismaTestReportFindUnique.mockResolvedValue(mockReport);

      const { GET } = await import('../test-reports/[id]/route');
      const request = createMockRequest('/api/test-reports/report-123');
      const params = Promise.resolve({ id: 'report-123' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('report-123');
    });

    it('should return 404 when report not found', async () => {
      mockPrismaTestReportFindUnique.mockResolvedValue(null);

      const { GET } = await import('../test-reports/[id]/route');
      const request = createMockRequest('/api/test-reports/unknown-id');
      const params = Promise.resolve({ id: 'unknown-id' });
      const response = await GET(request, { params });

      expect(response.status).toBe(404);
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaTestReportFindUnique.mockRejectedValue(new Error('Database error'));

      const { GET } = await import('../test-reports/[id]/route');
      const request = createMockRequest('/api/test-reports/report-123');
      const params = Promise.resolve({ id: 'report-123' });
      const response = await GET(request, { params });

      expect(response.status).toBe(500);
    });
  });

  // ========== DELETE /api/test-reports/[id] Tests ==========

  describe('DELETE /api/test-reports/[id]', () => {
    it('should require authentication', async () => {
      mockVerifyTokenFn.mockResolvedValue({ valid: false });

      const { DELETE } = await import('../test-reports/[id]/route');
      const request = createMockRequest('/api/test-reports/report-123', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: 'report-123' });
      const response = await DELETE(request, { params });

      expect(response.status).toBe(401);
    });

    it('should return 404 when report not found', async () => {
      mockPrismaTestReportFindUnique.mockResolvedValue(null);

      const { DELETE } = await import('../test-reports/[id]/route');
      const request = createMockRequest('/api/test-reports/report-123', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
      });
      const params = Promise.resolve({ id: 'report-123' });
      const response = await DELETE(request, { params });

      expect(response.status).toBe(404);
    });

    it('should delete report successfully', async () => {
      const mockReport = createMockTestReport({ id: 'report-123' });
      mockPrismaTestReportFindUnique.mockResolvedValue(mockReport);
      mockPrismaTestReportDelete.mockResolvedValue(mockReport);

      const { DELETE } = await import('../test-reports/[id]/route');
      const request = createMockRequest('/api/test-reports/report-123', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
      });
      const params = Promise.resolve({ id: 'report-123' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Test report deleted successfully');
      expect(mockPrismaTestReportDelete).toHaveBeenCalledWith({
        where: { id: 'report-123' },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaTestReportFindUnique.mockResolvedValue(createMockTestReport());
      mockPrismaTestReportDelete.mockRejectedValue(new Error('Database error'));

      const { DELETE } = await import('../test-reports/[id]/route');
      const request = createMockRequest('/api/test-reports/report-123', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
      });
      const params = Promise.resolve({ id: 'report-123' });
      const response = await DELETE(request, { params });

      expect(response.status).toBe(500);
    });
  });
});