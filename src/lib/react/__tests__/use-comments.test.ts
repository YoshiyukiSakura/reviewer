/**
 * Unit tests for useComments hook
 * These tests verify the hook's type definitions and exports
 */

import type { ReviewComment, PaginatedResponse } from '@/types'

describe('useComments types', () => {
  it('should have correct UseCommentsResult interface', () => {
    const mockResult: Awaited<ReturnType<typeof import('../use-comments').useComments>> = {
      comments: [
        {
          id: 'comment-1',
          content: 'Test comment',
          isResolved: false,
          authorId: 'user-1',
          reviewId: 'review-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      isLoading: false,
      error: null,
      refetch: async () => {},
      isRefetching: false,
    }

    expect(mockResult.comments).toHaveLength(1)
    expect(mockResult.comments[0].id).toBe('comment-1')
    expect(mockResult.isLoading).toBe(false)
  })

  it('should have correct UseReviewCommentsResult interface', () => {
    const mockResult: Awaited<ReturnType<typeof import('../use-comments').useReviewComments>> = {
      comments: [
        {
          id: 'comment-1',
          content: 'First comment',
          isResolved: false,
          authorId: 'user-1',
          reviewId: 'review-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'comment-2',
          content: 'Second comment',
          isResolved: true,
          authorId: 'user-2',
          reviewId: 'review-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      isLoading: false,
      error: null,
      refetch: async () => {},
      isRefetching: false,
    }

    expect(mockResult.comments).toHaveLength(2)
    expect(mockResult.comments[0].content).toBe('First comment')
  })

  it('should have correct UseCommentResult interface', () => {
    const mockResult: Awaited<ReturnType<typeof import('../use-comments').useComment>> = {
      comment: {
        id: 'comment-1',
        content: 'Test comment',
        filePath: 'src/index.ts',
        lineStart: 10,
        lineEnd: 15,
        isResolved: false,
        severity: 'SUGGESTION',
        authorId: 'user-1',
        reviewId: 'review-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      isLoading: false,
      error: null,
      refetch: async () => {},
      isRefetching: false,
    }

    expect(mockResult.comment).not.toBeNull()
    expect(mockResult.comment?.severity).toBe('SUGGESTION')
    expect(mockResult.comment?.filePath).toBe('src/index.ts')
  })

  it('should have correct UseCommentActionsResult interface', () => {
    const mockActions: Awaited<ReturnType<typeof import('../use-comments').useCommentActions>> = {
      createComment: async () => ({
        id: 'new-comment',
        content: 'New comment',
        isResolved: false,
        authorId: 'user-1',
        reviewId: 'review-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      updateComment: async () => ({
        id: 'comment-1',
        content: 'Updated',
        isResolved: true,
        authorId: 'user-1',
        reviewId: 'review-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      deleteComment: async () => {},
      resolveComment: async () => {},
      unresolveComment: async () => {},
    }

    expect(typeof mockActions.createComment).toBe('function')
    expect(typeof mockActions.updateComment).toBe('function')
    expect(typeof mockActions.deleteComment).toBe('function')
    expect(typeof mockActions.resolveComment).toBe('function')
    expect(typeof mockActions.unresolveComment).toBe('function')
  })

  it('should have correct UseUnresolvedCommentsResult interface', () => {
    const mockResult: Awaited<ReturnType<typeof import('../use-comments').useUnresolvedComments>> = {
      comments: [
        {
          id: 'comment-1',
          content: 'Unresolved comment',
          isResolved: false,
          authorId: 'user-1',
          reviewId: 'review-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      isLoading: false,
      error: null,
      refetch: async () => {},
      isRefetching: false,
    }

    expect(mockResult.comments).toHaveLength(1)
    expect(mockResult.comments[0].isResolved).toBe(false)
  })
})

describe('Comment type validation', () => {
  it('should accept all valid comment severities', () => {
    const severities: ReviewComment['severity'][] = ['INFO', 'SUGGESTION', 'WARNING', 'CRITICAL']

    severities.forEach((severity) => {
      const comment: ReviewComment = {
        id: 'test',
        content: 'Test comment',
        isResolved: false,
        severity,
        authorId: 'user-1',
        reviewId: 'review-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      expect(comment.severity).toBe(severity)
    })
  })

  it('should handle paginated comment response', () => {
    const mockPaginatedResponse: PaginatedResponse<ReviewComment> = {
      items: [
        {
          id: 'comment-1',
          content: 'Comment 1',
          isResolved: false,
          authorId: 'user-1',
          reviewId: 'review-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      total: 5,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    }

    expect(mockPaginatedResponse.items).toHaveLength(1)
    expect(mockPaginatedResponse.total).toBe(5)
  })

  it('should handle comments with line ranges', () => {
    const comment: ReviewComment = {
      id: 'comment-1',
      content: 'Line comment',
      filePath: 'src/components/App.tsx',
      lineStart: 42,
      lineEnd: 45,
      isResolved: false,
      authorId: 'user-1',
      reviewId: 'review-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    expect(comment.lineStart).toBe(42)
    expect(comment.lineEnd).toBe(45)
    expect(comment.filePath).toBe('src/components/App.tsx')
  })
})

describe('Hook exports', async () => {
  const hooks = await import('../use-comments')

  it('should export useComments hook', () => {
    expect(hooks.useComments).toBeDefined()
    expect(typeof hooks.useComments).toBe('function')
  })

  it('should export useReviewComments hook', () => {
    expect(hooks.useReviewComments).toBeDefined()
    expect(typeof hooks.useReviewComments).toBe('function')
  })

  it('should export useComment hook', () => {
    expect(hooks.useComment).toBeDefined()
    expect(typeof hooks.useComment).toBe('function')
  })

  it('should export useCommentActions hook', () => {
    expect(hooks.useCommentActions).toBeDefined()
    expect(typeof hooks.useCommentActions).toBe('function')
  })

  it('should export useUnresolvedComments hook', () => {
    expect(hooks.useUnresolvedComments).toBeDefined()
    expect(typeof hooks.useUnresolvedComments).toBe('function')
  })

  it('should export type definitions', () => {
    expect(hooks.UseCommentsResult).toBeDefined()
    expect(hooks.UseReviewCommentsResult).toBeDefined()
    expect(hooks.UseCommentResult).toBeDefined()
    expect(hooks.UseCommentActionsResult).toBeDefined()
    expect(hooks.UseUnresolvedCommentsResult).toBeDefined()
  })
})