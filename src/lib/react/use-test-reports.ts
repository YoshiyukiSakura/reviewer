'use client'

import { useCallback, useState } from 'react'
import {
  useDataFetch,
  UseDataFetchOptions,
} from './use-data-fetch'
import type { TestReport, TestReportFilterParams, PaginatedResponse } from '@/types'
import { axiosInstance, HttpError as NewHttpError } from '@/lib/http'
import type { CreateTestReportInput } from '@/lib/validators/test-reports'

/**
 * Return type for useTestReports hook
 */
export interface UseTestReportsResult {
  testReports: TestReport[]
  isLoading: boolean
  error: NewHttpError | null
  refetch: () => Promise<void>
  isRefetching: boolean
}

/**
 * Options for useTestReports hook
 */
export interface UseTestReportsOptions extends UseDataFetchOptions<PaginatedResponse<TestReport>> {
  /** Filter parameters */
  filters?: TestReportFilterParams
}

/**
 * Hook to fetch test reports list
 */
export function useTestReports(options: UseTestReportsOptions = {}): UseTestReportsResult {
  const { filters = {}, onSuccess, onError, select } = options

  const buildUrl = () => {
    const params = new URLSearchParams()
    params.set('page', String(filters.page ?? 1))
    params.set('pageSize', String(filters.pageSize ?? 10))

    if (filters.sortBy) {
      params.set('sortBy', filters.sortBy)
    }
    if (filters.sortOrder) {
      params.set('sortOrder', filters.sortOrder)
    }
    if (filters.recommendation) {
      params.set('recommendation', filters.recommendation)
    }
    if (filters.authorId) {
      params.set('authorId', filters.authorId)
    }
    if (filters.executionId) {
      params.set('executionId', filters.executionId)
    }
    if (filters.search) {
      params.set('search', filters.search)
    }
    if (filters.fromDate) {
      params.set('fromDate', filters.fromDate.toISOString())
    }
    if (filters.toDate) {
      params.set('toDate', filters.toDate.toISOString())
    }

    return `/test-reports?${params.toString()}`
  }

  const url = buildUrl()

  const result = useDataFetch<PaginatedResponse<TestReport>>(url, {
    immediate: true,
    onSuccess,
    onError,
    select,
  })

  return {
    testReports: result.data?.items ?? [],
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
    isRefetching: result.isRefetching,
  }
}

/**
 * Return type for useTestReport hook (single report)
 */
export interface UseTestReportResult {
  testReport: TestReport | null
  isLoading: boolean
  error: NewHttpError | null
  refetch: () => Promise<void>
  isRefetching: boolean
}

/**
 * Hook to fetch a single test report by ID
 */
export function useTestReport(reportId: string): UseTestReportResult {
  const result = useDataFetch<TestReport>(`/test-reports/${reportId}`, {
    immediate: !!reportId,
  })

  return {
    testReport: result.data,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
    isRefetching: result.isRefetching,
  }
}

/**
 * Return type for useTestReportActions hook
 */
export interface UseTestReportActionsResult {
  generateReport: (data: CreateTestReportInput) => Promise<TestReport>
  isLoading: boolean
}

/**
 * Hook providing test report mutation actions
 */
export function useTestReportActions(): UseTestReportActionsResult {
  const [isLoading, setIsLoading] = useState(false)

  const generateReport = useCallback(async (data: CreateTestReportInput): Promise<TestReport> => {
    setIsLoading(true)
    try {
      const response = await axiosInstance.post<TestReport>('/test-reports', data)
      return response.data
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    generateReport,
    isLoading,
  }
}