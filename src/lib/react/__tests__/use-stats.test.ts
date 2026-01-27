/**
 * Unit tests for useStats hook
 * These tests verify the hook's type definitions and exports
 */

import type { ReviewStats, CommentStats, DashboardStats } from '@/types'

describe('useDashboardStats types', () => {
  it('should have correct UseDashboardStatsResult interface', () => {
    const mockStats: DashboardStats = {
      reviews: {
        total: 10,
        pending: 3,
        inProgress: 2,
        approved: 4,
        changesRequested: 1,
        closed: 0,
      },
      comments: {
        total: 50,
        unresolved: 5,
        bySeverity: {
          info: 20,
          suggestion: 15,
          warning: 10,
          critical: 5,
        },
      },
      activityOverTime: [
        { date: '2024-01-01', reviews: 2, comments: 10 },
        { date: '2024-01-02', reviews: 3, comments: 15 },
      ],
    }

    const mockResult: Awaited<ReturnType<typeof import('../use-stats').useDashboardStats>> = {
      stats: mockStats,
      isLoading: false,
      error: null,
      refetch: async () => {},
      isRefetching: false,
    }

    expect(mockResult.stats).not.toBeNull()
    expect(mockResult.stats?.reviews.total).toBe(10)
    expect(mockResult.stats?.comments.total).toBe(50)
    expect(mockResult.stats?.activityOverTime).toHaveLength(2)
  })

  it('should handle null stats', () => {
    const mockResult: Awaited<ReturnType<typeof import('../use-stats').useDashboardStats>> = {
      stats: null,
      isLoading: false,
      error: null,
      refetch: async () => {},
      isRefetching: false,
    }

    expect(mockResult.stats).toBeNull()
  })
})

describe('useReviewStats types', () => {
  it('should have correct UseReviewStatsResult interface', () => {
    const mockStats: ReviewStats = {
      total: 15,
      pending: 5,
      inProgress: 3,
      approved: 5,
      changesRequested: 2,
      closed: 0,
    }

    const mockResult: Awaited<ReturnType<typeof import('../use-stats').useReviewStats>> = {
      stats: mockStats,
      isLoading: false,
      error: null,
      refetch: async () => {},
      isRefetching: false,
    }

    expect(mockResult.stats).toEqual(mockStats)
    expect(mockResult.stats?.total).toBe(15)
  })
})

describe('useCommentStats types', () => {
  it('should have correct UseCommentStatsResult interface', () => {
    const mockStats: CommentStats = {
      total: 100,
      unresolved: 10,
      bySeverity: {
        info: 40,
        suggestion: 30,
        warning: 20,
        critical: 10,
      },
    }

    const mockResult: Awaited<ReturnType<typeof import('../use-stats').useCommentStats>> = {
      stats: mockStats,
      isLoading: false,
      error: null,
      refetch: async () => {},
      isRefetching: false,
    }

    expect(mockResult.stats).toEqual(mockStats)
    expect(mockResult.stats?.bySeverity.critical).toBe(10)
  })
})

describe('useActivityStats types', () => {
  it('should have correct UseActivityStatsResult interface', () => {
    const mockData = [
      { date: '2024-01-01', reviews: 5, comments: 20 },
      { date: '2024-01-02', reviews: 3, comments: 15 },
    ]

    const mockResult: Awaited<ReturnType<typeof import('../use-stats').useActivityStats>> = {
      data: mockData,
      isLoading: false,
      error: null,
      refetch: async () => {},
      isRefetching: false,
    }

    expect(mockResult.data).toHaveLength(2)
    expect(mockResult.data[0].reviews).toBe(5)
    expect(mockResult.data[1].comments).toBe(15)
  })

  it('should have correct ActivityStatsOptions interface', () => {
    const options: Parameters<typeof import('../use-stats').useActivityStats>[0] = {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      interval: 'week',
    }

    expect(options.startDate).toBe('2024-01-01')
    expect(options.endDate).toBe('2024-01-31')
    expect(options.interval).toBe('week')
  })
})

describe('useUserStats types', () => {
  it('should have correct UseUserStatsResult interface', () => {
    const mockResult: Awaited<ReturnType<typeof import('../use-stats').useUserStats>> = {
      reviewsCount: 10,
      commentsCount: 50,
      approvalRate: 0.8,
      isLoading: false,
      error: null,
      refetch: async () => {},
      isRefetching: false,
    }

    expect(mockResult.reviewsCount).toBe(10)
    expect(mockResult.commentsCount).toBe(50)
    expect(mockResult.approvalRate).toBe(0.8)
  })

  it('should handle zero values', () => {
    const mockResult: Awaited<ReturnType<typeof import('../use-stats').useUserStats>> = {
      reviewsCount: 0,
      commentsCount: 0,
      approvalRate: 0,
      isLoading: false,
      error: null,
      refetch: async () => {},
      isRefetching: false,
    }

    expect(mockResult.reviewsCount).toBe(0)
    expect(mockResult.commentsCount).toBe(0)
    expect(mockResult.approvalRate).toBe(0)
  })
})

describe('useStatsActions types', () => {
  it('should have correct UseStatsActionsResult interface', () => {
    const mockActions: Awaited<ReturnType<typeof import('../use-stats').useStatsActions>> = {
      refreshStats: async () => {},
      exportStats: async () => {},
    }

    expect(typeof mockActions.refreshStats).toBe('function')
    expect(typeof mockActions.exportStats).toBe('function')
  })

  it('should support different export formats', async () => {
    const mockActions: Awaited<ReturnType<typeof import('../use-stats').useStatsActions>> = {
      refreshStats: async () => {},
      exportStats: async (format) => {
        expect(['json', 'csv', 'pdf']).toContain(format)
      },
    }

    await mockActions.exportStats('json')
    await mockActions.exportStats('csv')
    await mockActions.exportStats('pdf')
  })
})

describe('Stats type validation', () => {
  it('should validate ReviewStats structure', () => {
    const stats: ReviewStats = {
      total: 100,
      pending: 20,
      inProgress: 15,
      approved: 50,
      changesRequested: 10,
      closed: 5,
    }

    expect(stats.total).toBe(100)
    expect(stats.pending + stats.inProgress + stats.approved + stats.changesRequested + stats.closed).toBe(stats.total)
  })

  it('should validate CommentStats structure', () => {
    const stats: CommentStats = {
      total: 200,
      unresolved: 25,
      bySeverity: {
        info: 80,
        suggestion: 60,
        warning: 40,
        critical: 20,
      },
    }

    expect(stats.total).toBe(200)
    const severityTotal = Object.values(stats.bySeverity).reduce((a, b) => a + b, 0)
    expect(severityTotal).toBeLessThanOrEqual(stats.total)
  })

  it('should validate DashboardStats structure', () => {
    const stats: DashboardStats = {
      reviews: {
        total: 50,
        pending: 10,
        inProgress: 5,
        approved: 25,
        changesRequested: 5,
        closed: 5,
      },
      comments: {
        total: 150,
        unresolved: 20,
        bySeverity: {
          info: 50,
          suggestion: 40,
          warning: 35,
          critical: 25,
        },
      },
      activityOverTime: [],
    }

    expect(stats.reviews.total).toBe(50)
    expect(stats.comments.total).toBe(150)
    expect(Array.isArray(stats.activityOverTime)).toBe(true)
  })
})

describe('Hook exports', async () => {
  const hooks = await import('../use-stats')

  it('should export useDashboardStats hook', () => {
    expect(hooks.useDashboardStats).toBeDefined()
    expect(typeof hooks.useDashboardStats).toBe('function')
  })

  it('should export useReviewStats hook', () => {
    expect(hooks.useReviewStats).toBeDefined()
    expect(typeof hooks.useReviewStats).toBe('function')
  })

  it('should export useCommentStats hook', () => {
    expect(hooks.useCommentStats).toBeDefined()
    expect(typeof hooks.useCommentStats).toBe('function')
  })

  it('should export useActivityStats hook', () => {
    expect(hooks.useActivityStats).toBeDefined()
    expect(typeof hooks.useActivityStats).toBe('function')
  })

  it('should export useUserStats hook', () => {
    expect(hooks.useUserStats).toBeDefined()
    expect(typeof hooks.useUserStats).toBe('function')
  })

  it('should export useStatsActions hook', () => {
    expect(hooks.useStatsActions).toBeDefined()
    expect(typeof hooks.useStatsActions).toBe('function')
  })

  it('should export type definitions', () => {
    expect(hooks.UseDashboardStatsResult).toBeDefined()
    expect(hooks.UseReviewStatsResult).toBeDefined()
    expect(hooks.UseCommentStatsResult).toBeDefined()
    expect(hooks.UseActivityStatsResult).toBeDefined()
    expect(hooks.UseUserStatsResult).toBeDefined()
    expect(hooks.UseStatsActionsResult).toBeDefined()
    expect(hooks.ActivityDataPoint).toBeDefined()
    expect(hooks.ActivityStatsOptions).toBeDefined()
  })
})