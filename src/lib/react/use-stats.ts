'use client'

import { useCallback } from 'react'
import { useDataFetch, UseDataFetchOptions } from './use-data-fetch'
import type { ReviewStats, CommentStats, DashboardStats } from '@/types'
import { axiosInstance, HttpError as NewHttpError } from '@/lib/http'

/**
 * Return type for useDashboardStats hook
 */
export interface UseDashboardStatsResult {
  stats: DashboardStats | null
  isLoading: boolean
  error: NewHttpError | null
  refetch: () => Promise<void>
  isRefetching: boolean
}

/**
 * Hook to fetch dashboard statistics
 */
export function useDashboardStats(): UseDashboardStatsResult {
  const result = useDataFetch<DashboardStats>('/stats/dashboard', {
    immediate: true,
  })

  return {
    stats: result.data,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
    isRefetching: result.isRefetching,
  }
}

/**
 * Return type for useReviewStats hook
 */
export interface UseReviewStatsResult {
  stats: ReviewStats | null
  isLoading: boolean
  error: NewHttpError | null
  refetch: () => Promise<void>
  isRefetching: boolean
}

/**
 * Hook to fetch review statistics
 */
export function useReviewStats(): UseReviewStatsResult {
  const result = useDataFetch<ReviewStats>('/stats/reviews', {
    immediate: true,
  })

  return {
    stats: result.data,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
    isRefetching: result.isRefetching,
  }
}

/**
 * Return type for useCommentStats hook
 */
export interface UseCommentStatsResult {
  stats: CommentStats | null
  isLoading: boolean
  error: NewHttpError | null
  refetch: () => Promise<void>
  isRefetching: boolean
}

/**
 * Hook to fetch comment statistics
 */
export function useCommentStats(): UseCommentStatsResult {
  const result = useDataFetch<CommentStats>('/stats/comments', {
    immediate: true,
  })

  return {
    stats: result.data,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
    isRefetching: result.isRefetching,
  }
}

/**
 * Options for activity stats
 */
export interface ActivityStatsOptions {
  /** Start date for the activity period */
  startDate?: string
  /** End date for the activity period */
  endDate?: string
  /** Grouping interval: 'day', 'week', 'month' */
  interval?: 'day' | 'week' | 'month'
}

/**
 * Activity data point type
 */
export interface ActivityDataPoint {
  date: string
  reviews: number
  comments: number
}

/**
 * Return type for useActivityStats hook
 */
export interface UseActivityStatsResult {
  data: ActivityDataPoint[]
  isLoading: boolean
  error: NewHttpError | null
  refetch: () => Promise<void>
  isRefetching: boolean
}

/**
 * Hook to fetch activity statistics over time
 */
export function useActivityStats(options: ActivityStatsOptions = {}): UseActivityStatsResult {
  const { startDate, endDate, interval = 'day' } = options

  const buildUrl = () => {
    const params = new URLSearchParams()
    params.set('interval', interval)

    if (startDate) {
      params.set('startDate', startDate)
    }
    if (endDate) {
      params.set('endDate', endDate)
    }

    return `/stats/activity?${params.toString()}`
  }

  const url = buildUrl()

  const result = useDataFetch<ActivityDataPoint[]>(url, {
    immediate: true,
  })

  return {
    data: result.data ?? [],
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
    isRefetching: result.isRefetching,
  }
}

/**
 * Return type for useUserStats hook (user-specific statistics)
 */
export interface UseUserStatsResult {
  reviewsCount: number
  commentsCount: number
  approvalRate: number
  isLoading: boolean
  error: NewHttpError | null
  refetch: () => Promise<void>
  isRefetching: boolean
}

/**
 * Hook to fetch user-specific statistics
 */
export function useUserStats(userId: string): UseUserStatsResult {
  interface UserStatsData {
    reviewsCount: number
    commentsCount: number
    approvalRate: number
  }

  const result = useDataFetch<UserStatsData>(`/stats/users/${userId}`, {
    immediate: !!userId,
  })

  return {
    reviewsCount: result.data?.reviewsCount ?? 0,
    commentsCount: result.data?.commentsCount ?? 0,
    approvalRate: result.data?.approvalRate ?? 0,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
    isRefetching: result.isRefetching,
  }
}

/**
 * Return type for useStatsActions hook
 */
export interface UseStatsActionsResult {
  refreshStats: () => Promise<void>
  exportStats: (format: 'json' | 'csv' | 'pdf') => Promise<void>
}

/**
 * Hook providing stats-related actions
 */
export function useStatsActions(): UseStatsActionsResult {
  const refreshStats = useCallback(async (): Promise<void> => {
    await axiosInstance.post('/stats/refresh')
  }, [])

  const exportStats = useCallback(async (format: 'json' | 'csv' | 'pdf'): Promise<void> => {
    const response = await axiosInstance.get(`/stats/export?format=${format}`, {
      responseType: 'blob',
    })

    // Create a download link for the exported file
    const blob = new Blob([response.data], {
      type: format === 'csv' ? 'text/csv' : format === 'pdf' ? 'application/pdf' : 'application/json',
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `stats.${format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }, [])

  return {
    refreshStats,
    exportStats,
  }
}