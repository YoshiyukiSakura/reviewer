'use client'

import { useState, useCallback, useEffect } from 'react'
import { axiosInstance, HttpError } from '@/lib/http'

/**
 * Generic data fetching hook return type
 */
export interface UseDataFetchResult<T> {
  data: T | null
  isLoading: boolean
  error: HttpError | null
  refetch: () => Promise<void>
  isRefetching: boolean
}

/**
 * Options for the useDataFetch hook
 */
export interface UseDataFetchOptions<T> {
  /** Whether to fetch data on mount */
  immediate?: boolean
  /** Callback called on successful fetch */
  onSuccess?: (data: T) => void
  /** Callback called on fetch error */
  onError?: (error: HttpError) => void
  /** Transform the response data before returning */
  select?: (data: T) => T
}

/**
 * Common data fetching hook that handles loading and error states
 */
export function useDataFetch<T>(
  url: string,
  options: UseDataFetchOptions<T> = {}
): UseDataFetchResult<T> {
  const { immediate = true, onSuccess, onError, select } = options

  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(immediate)
  const [error, setError] = useState<HttpError | null>(null)
  const [isRefetching, setIsRefetching] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      if (!isLoading && data !== null) {
        setIsRefetching(true)
      }
      setIsLoading(true)
      setError(null)

      const response = await axiosInstance.get<T>(url)
      const result = select ? select(response.data) : response.data

      setData(result)
      onSuccess?.(result)
      return result
    } catch (err) {
      const httpError = err instanceof HttpError ? err : new HttpError(
        err instanceof Error ? err.message : 'An unexpected error occurred',
        0
      )
      setError(httpError)
      onError?.(httpError)
      return null
    } finally {
      setIsLoading(false)
      setIsRefetching(false)
    }
  }, [url, select, onSuccess, onError, isLoading, data])

  useEffect(() => {
    if (immediate) {
      fetchData()
    }
  }, [immediate, fetchData])

  return {
    data,
    isLoading,
    error,
    refetch: () => fetchData().then(() => {}),
    isRefetching,
  }
}

/**
 * Options for paginated data fetching
 */
export interface UsePaginatedDataFetchOptions<T> extends UseDataFetchOptions<T> {
  /** Initial page number */
  initialPage?: number
  /** Initial page size */
  initialPageSize?: number
}

/**
 * Paginated data fetching hook return type
 */
export interface UsePaginatedDataFetchResult<T> extends UseDataFetchResult<T> {
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  goToPage: (page: number) => void
  nextPage: () => void
  previousPage: () => void
}

/**
 * Paginated data fetching hook
 */
export function usePaginatedDataFetch<T>(
  baseUrl: string,
  options: UsePaginatedDataFetchOptions<T> = {}
): UsePaginatedDataFetchResult<T> {
  const { initialPage = 1, initialPageSize = 10, onSuccess, onError, select } = options

  const [page, setPageState] = useState(initialPage)
  const [pageSize, setPageSizeState] = useState(initialPageSize)

  const url = `${baseUrl}?page=${page}&pageSize=${pageSize}`

  const baseResult = useDataFetch<T>(url, {
    immediate: true,
    onSuccess,
    onError,
    select,
  })

  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Extract pagination info from data if available
  useEffect(() => {
    if (baseResult.data && typeof baseResult.data === 'object') {
      const data = baseResult.data as Record<string, unknown>
      if ('total' in data) {
        setTotal(data.total as number)
      }
      if ('totalPages' in data) {
        setTotalPages(data.totalPages as number)
      }
    }
  }, [baseResult.data])

  const setPage = useCallback((newPage: number) => {
    setPageState(Math.max(1, newPage))
  }, [])

  const setPageSize = useCallback((newPageSize: number) => {
    setPageSizeState(Math.max(1, newPageSize))
    setPageState(1) // Reset to first page when page size changes
  }, [])

  const goToPage = useCallback((newPage: number) => {
    const validPage = Math.max(1, Math.min(newPage, totalPages))
    setPageState(validPage)
  }, [totalPages])

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      setPageState(page + 1)
    }
  }, [page, totalPages])

  const previousPage = useCallback(() => {
    if (page > 1) {
      setPageState(page - 1)
    }
  }, [page])

  return {
    ...baseResult,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
    setPage,
    setPageSize,
    goToPage,
    nextPage,
    previousPage,
  }
}