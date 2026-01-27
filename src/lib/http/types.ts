/**
 * HTTP client type definitions
 */

import type { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'

/**
 * Generic interface for API request options
 */
export interface RequestOptions<T = unknown> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  data?: T
  params?: Record<string, unknown>
  headers?: Record<string, string>
  withAuth?: boolean
}

/**
 * Generic API response wrapper
 */
export interface ApiResult<T> {
  success: boolean
  data?: T
  error?: string
  status: number
}

/**
 * Paginated API response
 */
export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Extended Axios request configuration with auth flag
 */
export interface AuthAxiosRequestConfig extends InternalAxiosRequestConfig {
  withAuth?: boolean
}

/**
 * Extended Axios response with result typing
 */
export interface TypedAxiosResponse<T> extends AxiosResponse<T> {
  result?: ApiResult<T>
}

/**
 * HTTP error details for debugging
 */
export interface HttpErrorDetails {
  url: string
  method: string
  status: number | null
  message: string
  data?: unknown
  timestamp: string
}

/**
 * Retry configuration for failed requests
 */
export interface RetryConfig {
  maxRetries: number
  retryDelay: number
  retryableStatusCodes: number[]
}

/**
 * Default retry configuration
 */
export const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
}

/**
 * Request interceptor callback type
 */
export type RequestInterceptor = (
  config: InternalAxiosRequestConfig
) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>

/**
 * Response interceptor success callback type
 */
export type ResponseInterceptorSuccess<T = unknown> = (
  response: AxiosResponse<T>
) => T | Promise<T>

/**
 * Response interceptor error callback type
 */
export type ResponseInterceptorError = (error: AxiosError) => unknown

/**
 * Builder pattern for creating HTTP requests
 */
export interface RequestBuilder {
  setBaseURL(url: string): RequestBuilder
  setAuthToken(token: string): RequestBuilder
  setHeader(key: string, value: string): RequestBuilder
  setTimeout(timeout: number): RequestBuilder
  setRetry(config: Partial<RetryConfig>): RequestBuilder
  get<T>(url: string, params?: Record<string, unknown>): Promise<ApiResult<T>>
  post<T>(url: string, data?: unknown): Promise<ApiResult<T>>
  put<T>(url: string, data?: unknown): Promise<ApiResult<T>>
  patch<T>(url: string, data?: unknown): Promise<ApiResult<T>>
  delete<T>(url: string): Promise<ApiResult<T>>
}