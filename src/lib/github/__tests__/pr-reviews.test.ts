/**
 * Tests for PR Reviews API Module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  listPRReviews,
  getPRReview,
  createPRReview,
  submitPRReview,
  deletePRReview,
  type PRParams,
  type ReviewEvent,
  type ReviewComment,
} from '../pr-reviews';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('PR Reviews API', () => {
  const baseParams: PRParams = {
    owner: 'octocat',
    repo: 'hello-world',
    pullNumber: 42,
  };

  // Store original environment
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock environment variables
    process.env = {
      ...originalEnv,
      GITHUB_TOKEN: 'test-token',
      GITHUB_API_URL: 'https://api.github.com',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('listPRReviews', () => {
    it('should return list of reviews on success', async () => {
      const mockReviews = [
        {
          id: 1,
          node_id: 'MDE3OlB1bGxSZXF1ZXN0UmV2aWV3MQ==',
          user: { login: 'octocat' },
          state: 'APPROVED',
          body: 'LGTM!',
          body_html: '<p>LGTM!</p>',
          html_url: 'https://github.com/octocat/hello-world/pull/42#pullrequestreview-1',
          pull_request_url: 'https://api.github.com/repos/octocat/hello-world/pulls/42',
          commit_id: 'abc123',
          base_commit_id: 'def456',
          submitted_at: '2024-01-15T10:00:00Z',
          comments: [],
        },
        {
          id: 2,
          node_id: 'MDE3OlB1bGxSZXF1ZXN0UmV2aWV3Mg==',
          user: { login: 'monalisa' },
          state: 'CHANGES_REQUESTED',
          body: 'Please fix the typo',
          body_html: '<p>Please fix the typo</p>',
          html_url: 'https://github.com/octocat/hello-world/pull/42#pullrequestreview-2',
          pull_request_url: 'https://api.github.com/repos/octocat/hello-world/pulls/42',
          commit_id: 'abc123',
          base_commit_id: 'def456',
          submitted_at: '2024-01-16T10:00:00Z',
          comments: [
            {
              id: 1,
              path: 'README.md',
              line: 10,
              body: 'Typo on this line',
              body_text: 'Typo on this line',
              html_url: 'https://github.com/octocat/hello-world/pull/42#discussioncomment-1',
              pull_request_url: 'https://api.github.com/repos/octocat/hello-world/pulls/42',
              commit_id: 'abc123',
            },
          ],
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockReviews,
      });

      const result = await listPRReviews(baseParams);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].id).toBe(1);
        expect(result.data[0].state).toBe('APPROVED');
        expect(result.data[0].userLogin).toBe('octocat');
        expect(result.data[1].id).toBe(2);
        expect(result.data[1].comments).toHaveLength(1);
      }
    });

    it('should return error for invalid params', async () => {
      const result = await listPRReviews({ owner: '', repo: 'hello-world', pullNumber: 42 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid owner parameter');
      }
    });

    it('should return error for 401 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const result = await listPRReviews(baseParams);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid or expired GitHub token');
      }
    });

    it('should return error for 404 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await listPRReviews(baseParams);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Pull request not found');
      }
    });

    it('should return error for network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await listPRReviews(baseParams);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Network error');
      }
    });
  });

  describe('getPRReview', () => {
    it('should return review on success', async () => {
      const mockReview = {
        id: 123,
        node_id: 'MDE3OlB1bGxSZXF1ZXN0UmV2aWV3Mw==',
        user: { login: 'octocat' },
        state: 'APPROVED',
        body: 'Looks good!',
        body_html: '<p>Looks good!</p>',
        html_url: 'https://github.com/octocat/hello-world/pull/42#pullrequestreview-123',
        pull_request_url: 'https://api.github.com/repos/octocat/hello-world/pulls/42',
        commit_id: 'abc123',
        base_commit_id: 'def456',
        submitted_at: '2024-01-15T10:00:00Z',
        comments: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockReview,
      });

      const result = await getPRReview(baseParams, 123);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(123);
        expect(result.data.state).toBe('APPROVED');
        expect(result.data.userLogin).toBe('octocat');
      }
    });

    it('should return error for invalid reviewId', async () => {
      const result = await getPRReview(baseParams, 0);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid reviewId parameter');
      }
    });

    it('should return error for 403 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      const result = await getPRReview(baseParams, 123);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Insufficient permissions');
      }
    });

    it('should return error for 404 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await getPRReview(baseParams, 999);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Review not found');
      }
    });
  });

  describe('createPRReview', () => {
    it('should create review on success', async () => {
      const mockReview = {
        id: 456,
        node_id: 'MDE3OlB1bGxSZXF1ZXN0UmV2aWV3Ng==',
        user: { login: 'monalisa' },
        state: 'PENDING',
        body: 'This is a draft review',
        body_html: '<p>This is a draft review</p>',
        html_url: 'https://github.com/octocat/hello-world/pull/42#pullrequestreview-456',
        pull_request_url: 'https://api.github.com/repos/octocat/hello-world/pulls/42',
        commit_id: 'abc123',
        base_commit_id: 'def456',
        comments: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockReview,
      });

      const result = await createPRReview(baseParams, {
        event: 'COMMENT',
        body: 'This is a draft review',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(456);
        expect(result.data.state).toBe('PENDING');
      }
    });

    it('should create review with comments', async () => {
      const comments: ReviewComment[] = [
        { path: 'src/index.ts', line: 10, body: 'Consider using const' },
        { path: 'src/index.ts', line: 15, startLine: 15, body: 'Good job!' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 789,
          state: 'PENDING',
          comments: [
            { id: 1, path: 'src/index.ts', line: 10, body: 'Consider using const' },
            { id: 2, path: 'src/index.ts', line: 15, start_line: 15, body: 'Good job!' },
          ],
        }),
      });

      const result = await createPRReview(baseParams, {
        event: 'REQUEST_CHANGES',
        comments,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/pulls/42/reviews'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              event: 'REQUEST_CHANGES',
              comments: [
                { path: 'src/index.ts', line: 10, body: 'Consider using const' },
                { path: 'src/index.ts', line: 15, start_line: 15, body: 'Good job!' },
              ],
            }),
          })
        );
      }
    });

    it('should return error for 422 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        text: async () => 'Validation Failed',
      });

      const result = await createPRReview(baseParams, { event: 'APPROVE' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Validation failed');
      }
    });
  });

  describe('submitPRReview', () => {
    it('should submit review on success', async () => {
      const mockReview = {
        id: 456,
        node_id: 'MDE3OlB1bGxSZXF1ZXN0UmV2aWV3Ng==',
        user: { login: 'monalisa' },
        state: 'APPROVED',
        body: 'Approved!',
        body_html: '<p>Approved!</p>',
        html_url: 'https://github.com/octocat/hello-world/pull/42#pullrequestreview-456',
        pull_request_url: 'https://api.github.com/repos/octocat/hello-world/pulls/42',
        commit_id: 'abc123',
        base_commit_id: 'def456',
        submitted_at: '2024-01-15T10:00:00Z',
        comments: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockReview,
      });

      const result = await submitPRReview(baseParams, 456, {
        event: 'APPROVE' as ReviewEvent,
        body: 'Great work!',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(456);
        expect(result.data.state).toBe('APPROVED');
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/reviews/456/events'),
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({
              event: 'APPROVE',
              body: 'Great work!',
            }),
          })
        );
      }
    });

    it('should return error for invalid params', async () => {
      const result = await submitPRReview(
        { owner: 'octocat', repo: '', pullNumber: 42 },
        456,
        { event: 'APPROVE' }
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid repo parameter');
      }
    });

    it('should return error for 500 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Internal Server Error',
      });

      const result = await submitPRReview(baseParams, 456, {
        event: 'COMMENT',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('internal server error');
      }
    });
  });

  describe('deletePRReview', () => {
    it('should delete review on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await deletePRReview(baseParams, 456);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reviewId).toBe(456);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/reviews/456'),
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      }
    });

    it('should return error for 403 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'Forbidden',
      });

      const result = await deletePRReview(baseParams, 456);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Insufficient permissions');
      }
    });

    it('should return error for 422 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        text: async () => 'Review has already been approved',
      });

      const result = await deletePRReview(baseParams, 456);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Cannot delete review');
      }
    });
  });

  describe('Parameter Validation', () => {
    it('should reject empty owner', async () => {
      const result = await listPRReviews({ owner: '', repo: 'hello', pullNumber: 1 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('owner');
    });

    it('should reject non-string owner', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await listPRReviews({ owner: 123 as any, repo: 'hello', pullNumber: 1 });
      expect(result.success).toBe(false);
    });

    it('should reject empty repo', async () => {
      const result = await listPRReviews({ owner: 'test', repo: '', pullNumber: 1 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('repo');
    });

    it('should reject zero pullNumber', async () => {
      const result = await listPRReviews({ owner: 'test', repo: 'hello', pullNumber: 0 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('pullNumber');
    });

    it('should reject negative pullNumber', async () => {
      const result = await listPRReviews({ owner: 'test', repo: 'hello', pullNumber: -1 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('pullNumber');
    });
  });
});