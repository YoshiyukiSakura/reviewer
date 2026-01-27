'use client'

import { useCallback, useState } from 'react'
import { useDataFetch, UseDataFetchOptions } from './use-data-fetch'
import type { ReviewComment, CommentFilterParams, PaginatedResponse } from '@/types'
import { axiosInstance, HttpError as NewHttpError } from '@/lib/http'

/**
 * Return type for useComments hook
 */
export interface UseCommentsResult {
  comments: ReviewComment[]
  isLoading: boolean
  error: NewHttpError | null
  refetch: () => Promise<void>
  isRefetching: boolean
}

/**
 * Options for useComments hook
 */
export interface UseCommentsOptions extends UseDataFetchOptions<PaginatedResponse<ReviewComment>> {
  /** Filter parameters */
  filters?: CommentFilterParams
}

/**
 * Hook to fetch comments list
 */
export function useComments(options: UseCommentsOptions = {}): UseCommentsResult {
  const { filters = {}, onSuccess, onError, select } = options

  const buildUrl = () => {
    const params = new URLSearchParams()
    params.set('page', String(filters.page ?? 1))
    params.set('pageSize', String(filters.pageSize ?? 10))

    if (filters.reviewId) {
      params.set('reviewId', filters.reviewId)
    }
    if (filters.isResolved !== undefined) {
      params.set('isResolved', String(filters.isResolved))
    }
    if (filters.severity) {
      params.set('severity', filters.severity)
    }
    if (filters.authorId) {
      params.set('authorId', filters.authorId)
    }
    if (filters.sortBy) {
      params.set('sortBy', filters.sortBy)
    }
    if (filters.sortOrder) {
      params.set('sortOrder', filters.sortOrder)
    }

    return `/comments?${params.toString()}`
  }

  const url = buildUrl()

  const result = useDataFetch<PaginatedResponse<ReviewComment>>(url, {
    immediate: true,
    onSuccess,
    onError,
    select,
  })

  return {
    comments: result.data?.items ?? [],
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
    isRefetching: result.isRefetching,
  }
}

/**
 * Return type for useReviewComments hook (comments for a specific review)
 */
export interface UseReviewCommentsResult {
  comments: ReviewComment[]
  isLoading: boolean
  error: NewHttpError | null
  refetch: () => Promise<void>
  isRefetching: boolean
}

/**
 * Hook to fetch all comments for a specific review
 */
export function useReviewComments(reviewId: string): UseReviewCommentsResult {
  const result = useDataFetch<ReviewComment[]>(`/reviews/${reviewId}/comments`, {
    immediate: !!reviewId,
  })

  return {
    comments: result.data ?? [],
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
    isRefetching: result.isRefetching,
  }
}

/**
 * Return type for useComment hook (single comment)
 */
export interface UseCommentResult {
  comment: ReviewComment | null
  isLoading: boolean
  error: NewHttpError | null
  refetch: () => Promise<void>
  isRefetching: boolean
}

/**
 * Hook to fetch a single comment by ID
 */
export function useComment(commentId: string): UseCommentResult {
  const result = useDataFetch<ReviewComment>(`/comments/${commentId}`, {
    immediate: !!commentId,
  })

  return {
    comment: result.data,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
    isRefetching: result.isRefetching,
  }
}

/**
 * Return type for useCommentActions hook
 */
export interface UseCommentActionsResult {
  createComment: (reviewId: string, data: Partial<ReviewComment>) => Promise<ReviewComment>
  updateComment: (commentId: string, data: Partial<ReviewComment>) => Promise<ReviewComment>
  deleteComment: (commentId: string) => Promise<void>
  resolveComment: (commentId: string) => Promise<void>
  unresolveComment: (commentId: string) => Promise<void>
}

/**
 * Hook providing comment mutation actions
 */
export function useCommentActions(): UseCommentActionsResult {
  const createComment = useCallback(async (
    reviewId: string,
    data: Partial<ReviewComment>
  ): Promise<ReviewComment> => {
    const response = await axiosInstance.post<ReviewComment>(`/reviews/${reviewId}/comments`, data)
    return response.data
  }, [])

  const updateComment = useCallback(async (
    commentId: string,
    data: Partial<ReviewComment>
  ): Promise<ReviewComment> => {
    const response = await axiosInstance.patch<ReviewComment>(`/comments/${commentId}`, data)
    return response.data
  }, [])

  const deleteComment = useCallback(async (commentId: string): Promise<void> => {
    await axiosInstance.delete(`/comments/${commentId}`)
  }, [])

  const resolveComment = useCallback(async (commentId: string): Promise<void> => {
    await axiosInstance.patch(`/comments/${commentId}`, { isResolved: true })
  }, [])

  const unresolveComment = useCallback(async (commentId: string): Promise<void> => {
    await axiosInstance.patch(`/comments/${commentId}`, { isResolved: false })
  }, [])

  return {
    createComment,
    updateComment,
    deleteComment,
    resolveComment,
    unresolveComment,
  }
}

/**
 * Return type for useUnresolvedComments hook
 */
export interface UseUnresolvedCommentsResult {
  comments: ReviewComment[]
  isLoading: boolean
  error: NewHttpError | null
  refetch: () => Promise<void>
  isRefetching: boolean
}

/**
 * Hook to fetch unresolved comments for a review
 */
export function useUnresolvedComments(reviewId: string): UseUnresolvedCommentsResult {
  const result = useDataFetch<ReviewComment[]>(
    `/reviews/${reviewId}/comments?isResolved=false`,
    { immediate: !!reviewId }
  )

  return {
    comments: result.data ?? [],
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
    isRefetching: result.isRefetching,
  }
}