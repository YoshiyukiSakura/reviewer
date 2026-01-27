/**
 * HTTP client module exports
 */

// Configuration
export { getBaseURL, getTimeout, getWithCredentials, getHttpClientConfig } from './config'

// Types
export type {
  RequestOptions,
  ApiResult,
  PaginatedResult,
  HttpErrorDetails,
  RetryConfig,
  defaultRetryConfig,
} from './types'

// Client
export {
  axiosInstance,
  createAxiosInstance,
  HttpError,
  getAuthToken,
  setAuthToken,
} from './client'

export type { HttpErrorResponse } from './client'