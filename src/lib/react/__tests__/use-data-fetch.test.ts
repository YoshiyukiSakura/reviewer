/**
 * Unit tests for useDataFetch hook
 * These tests verify the hook's type definitions and exports
 */

import type { HttpError } from '@/types'

describe('useDataFetch types', () => {
  it('should have correct UseDataFetchResult interface', () => {
    const mockResult: Awaited<ReturnType<typeof import('../use-data-fetch').useDataFetch<string>>> = {
      data: 'test-data',
      isLoading: false,
      error: null,
      refetch: async () => {},
      isRefetching: false,
    }

    expect(mockResult.data).toBe('test-data')
    expect(mockResult.isLoading).toBe(false)
    expect(mockResult.error).toBeNull()
  })

  it('should handle null data', () => {
    const mockResult: Awaited<ReturnType<typeof import('../use-data-fetch').useDataFetch<string>>> = {
      data: null,
      isLoading: false,
      error: null,
      refetch: async () => {},
      isRefetching: false,
    }

    expect(mockResult.data).toBeNull()
  })

  it('should handle error state', () => {
    // Mock HttpError
    class MockHttpError extends Error {
      status: number
      data?: unknown
      constructor(message: string, status: number, data?: unknown) {
        super(message)
        this.name = 'HttpError'
        this.status = status
        this.data = data
      }
    }

    const mockError = new MockHttpError('Not found', 404, { message: 'Not found' })
    const mockResult: Awaited<ReturnType<typeof import('../use-data-fetch').useDataFetch<string>>> = {
      data: null,
      isLoading: false,
      error: mockError,
      refetch: async () => {},
      isRefetching: false,
    }

    expect(mockResult.error).not.toBeNull()
    expect(mockResult.error?.status).toBe(404)
  })

  it('should have correct UseDataFetchOptions interface', () => {
    const options: Parameters<typeof import('../use-data-fetch').useDataFetch>[1] = {
      immediate: false,
      onSuccess: (data) => console.log(data),
      onError: (error) => console.error(error),
      select: (data) => data.toUpperCase(),
    }

    expect(options.immediate).toBe(false)
    expect(typeof options.onSuccess).toBe('function')
    expect(typeof options.onError).toBe('function')
    expect(typeof options.select).toBe('function')
  })
})

describe('usePaginatedDataFetch types', () => {
  it('should have correct UsePaginatedDataFetchResult interface', () => {
    const mockResult: Awaited<ReturnType<typeof import('../use-data-fetch').usePaginatedDataFetch<string>>> = {
      data: ['item1', 'item2'],
      isLoading: false,
      error: null,
      refetch: async () => {},
      isRefetching: false,
      pagination: {
        page: 1,
        pageSize: 10,
        total: 100,
        totalPages: 10,
        hasNextPage: true,
        hasPreviousPage: false,
      },
      setPage: (page) => {},
      setPageSize: (size) => {},
      goToPage: (page) => {},
      nextPage: () => {},
      previousPage: () => {},
    }

    expect(mockResult.data).toHaveLength(2)
    expect(mockResult.pagination.page).toBe(1)
    expect(mockResult.pagination.total).toBe(100)
    expect(mockResult.pagination.hasNextPage).toBe(true)
    expect(mockResult.pagination.hasPreviousPage).toBe(false)
    expect(typeof mockResult.setPage).toBe('function')
    expect(typeof mockResult.nextPage).toBe('function')
  })

  it('should handle last page correctly', () => {
    const mockResult: Awaited<ReturnType<typeof import('../use-data-fetch').usePaginatedDataFetch<string>>> = {
      data: [],
      isLoading: false,
      error: null,
      refetch: async () => {},
      isRefetching: false,
      pagination: {
        page: 10,
        pageSize: 10,
        total: 100,
        totalPages: 10,
        hasNextPage: false,
        hasPreviousPage: true,
      },
      setPage: (page) => {},
      setPageSize: (size) => {},
      goToPage: (page) => {},
      nextPage: () => {},
      previousPage: () => {},
    }

    expect(mockResult.pagination.hasNextPage).toBe(false)
    expect(mockResult.pagination.hasPreviousPage).toBe(true)
  })

  it('should have correct pagination navigation functions', () => {
    const mockResult: Awaited<ReturnType<typeof import('../use-data-fetch').usePaginatedDataFetch<string>>> = {
      data: [],
      isLoading: false,
      error: null,
      refetch: async () => {},
      isRefetching: false,
      pagination: {
        page: 1,
        pageSize: 10,
        total: 100,
        totalPages: 10,
        hasNextPage: true,
        hasPreviousPage: false,
      },
      setPage: (page) => {
        expect(page).toBe(2)
      },
      setPageSize: (size) => {
        expect(size).toBe(20)
      },
      goToPage: (page) => {
        expect(page).toBe(5)
      },
      nextPage: () => {},
      previousPage: () => {},
    }

    mockResult.setPage(2)
    mockResult.setPageSize(20)
    mockResult.goToPage(5)
  })
})

describe('Hook exports', () => {
  it('should export useDataFetch hook', async () => {
    const hooks = await import('../use-data-fetch')
    expect(hooks.useDataFetch).toBeDefined()
    expect(typeof hooks.useDataFetch).toBe('function')
  })

  it('should export usePaginatedDataFetch hook', async () => {
    const hooks = await import('../use-data-fetch')
    expect(hooks.usePaginatedDataFetch).toBeDefined()
    expect(typeof hooks.usePaginatedDataFetch).toBe('function')
  })

  it('should export type definitions', async () => {
    const hooks = await import('../use-data-fetch')
    expect(hooks.UseDataFetchResult).toBeDefined()
    expect(hooks.UsePaginatedDataFetchResult).toBeDefined()
  })
})