'use client'

import { useCallback } from 'react'
import {
  useDataFetch,
  usePaginatedDataFetch,
  UseDataFetchOptions,
  UsePaginatedDataFetchOptions,
} from './use-data-fetch'
import type { Review, ReviewFilterParams, PaginatedResponse } from '@/types'
import { axiosInstance, HttpError as NewHttpError } from '@/lib/http'

/**
 * Return type for useReviews hook
 */
export interface UseReviewsResult {
  reviews: Review[]
  isLoading: boolean
  error: NewHttpError | null
  refetch: () => Promise<void>
  isRefetching: boolean
}

/**
 * Options for useReviews hook
 */
export interface UseReviewsOptions extends UseDataFetchOptions<PaginatedResponse<Review>> {
  /** Filter parameters */
  filters?: ReviewFilterParams
}

/**
 * Hook to fetch reviews list
 */
export function useReviews(options: UseReviewsOptions = {}): UseReviewsResult {
  const { filters = {}, onSuccess, onError, select } = options

  const buildUrl = () => {
    const params = new URLSearchParams()
    params.set('page', String(filters.page ?? 1))
    params.set('pageSize', String(filters.pageSize ?? 10))

    if (filters.status) {
      params.set('status', filters.status)
    }
    if (filters.authorId) {
      params.set('authorId', filters.authorId)
    }
    if (filters.search) {
      params.set('search', filters.search)
    }
    if (filters.sortBy) {
      params.set('sortBy', filters.sortBy)
    }
    if (filters.sortOrder) {
      params.set('sortOrder', filters.sortOrder)
    }

    return `/reviews?${params.toString()}`
  }

  const url = buildUrl()

  const result = useDataFetch<PaginatedResponse<Review>>(url, {
    immediate: true,
    onSuccess,
    onError,
    select,
  })

  return {
    reviews: result.data?.items ?? [],
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
    isRefetching: result.isRefetching,
  }
}

/**
 * Return type for useReview hook (single review)
 */
export interface UseReviewResult {
  review: Review | null
  isLoading: boolean
  error: NewHttpError | null
  refetch: () => Promise<void>
  isRefetching: boolean
}

/**
 * Hook to fetch a single review by ID
 */
export function useReview(reviewId: string): UseReviewResult {
  const result = useDataFetch<Review>(`/reviews/${reviewId}`, {
    immediate: !!reviewId,
  })

  return {
    review: result.data,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
    isRefetching: result.isRefetching,
  }
}

/**
 * Return type for useReviewActions hook
 */
export interface UseReviewActionsResult {
  createReview: (data: Partial<Review>) => Promise<Review>
  updateReview: (reviewId: string, data: Partial<Review>) => Promise<Review>
  deleteReview: (reviewId: string) => Promise<void>
}

/**
 * Hook providing review mutation actions
 */
export function useReviewActions(): UseReviewActionsResult {
  const createReview = useCallback(async (data: Partial<Review>): Promise<Review> => {
    const response = await axiosInstance.post<Review>('/reviews', data)
    return response.data
  }, [])

  const updateReview = useCallback(async (reviewId: string, data: Partial<Review>): Promise<Review> => {
    const response = await axiosInstance.patch<Review>(`/reviews/${reviewId}`, data)
    return response.data
  }, [])

  const deleteReview = useCallback(async (reviewId: string): Promise<void> => {
    await axiosInstance.delete(`/reviews/${reviewId}`)
  }, [])

  return {
    createReview,
    updateReview,
    deleteReview,
  }
}

/**
 * Return type for useReviewStatus hook
 */
export interface UseReviewStatusResult {
  updateStatus: (reviewId: string, status: Review['status']) => Promise<void>
  isUpdating: boolean
  error: NewHttpError | null
}

/**
 * Hook to update review status
 */
export function useReviewStatus(): UseReviewStatusResult {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<NewHttpError | null>(null)

  const updateStatus = useCallback(async (reviewId: string, status: Review['status']): Promise<void> => {
    setIsUpdating(true)
    setError(null)
    try {
      await axiosInstance.patch(`/reviews/${reviewId}`, { status })
    } catch (err) {
      const httpError = err instanceof NewHttpError ? err : new NewHttpError(
        err instanceof Error ? err.message : 'Failed to update status',
        0
      )
      setError(httpError)
      throw httpError
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return {
    updateStatus,
    isUpdating,
    error,
  }
}

// Import useState for the hook above
import { useState } from 'react'