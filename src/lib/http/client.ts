import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { getHttpClientConfig } from './config'

/**
 * HTTP error response interface
 */
export interface HttpErrorResponse {
  status: number
  message: string
  data?: unknown
}

/**
 * Custom HTTP error class with additional context
 */
export class HttpError extends Error {
  public readonly status: number
  public readonly data?: unknown

  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.data = data
  }
}

/**
 * Get the authorization token for requests
 * Override this function to implement custom token retrieval logic
 */
export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    // Client-side: get from localStorage
    return localStorage.getItem('auth_token')
  }
  // Server-side: get from environment
  return process.env.API_AUTH_TOKEN || null
}

/**
 * Set the authorization token storage
 * Override this function to implement custom token storage
 */
export function setAuthToken(token: string | null): void {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('auth_token', token)
    } else {
      localStorage.removeItem('auth_token')
    }
  }
}

/**
 * Global axios instance for the application
 * Uses a singleton pattern to prevent multiple instances
 */
const globalForHttp = globalThis as unknown as {
  axiosInstance: AxiosInstance | undefined
}

export const axiosInstance: AxiosInstance =
  globalForHttp.axiosInstance ||
  createAxiosInstance()

if (process.env.NODE_ENV !== 'production') {
  globalForHttp.axiosInstance = axiosInstance
}

/**
 * Create and configure a new Axios instance with interceptors
 */
export function createAxiosInstance(): AxiosInstance {
  const config = getHttpClientConfig()

  const instance = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout,
    withCredentials: config.withCredentials,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Request interceptor: adds auth token to requests
  instance.interceptors.request.use(
    (reqConfig: InternalAxiosRequestConfig) => {
      const token = getAuthToken()
      if (token && reqConfig.headers) {
        reqConfig.headers.Authorization = `Bearer ${token}`
      }
      return reqConfig
    },
    (error: AxiosError) => {
      return Promise.reject(error)
    }
  )

  // Response interceptor: handles errors and transforms responses
  instance.interceptors.response.use(
    (response) => {
      return response
    },
    (error: AxiosError) => {
      const httpError = createHttpError(error)
      return Promise.reject(httpError)
    }
  )

  return instance
}

/**
 * Create a standardized HttpError from an AxiosError
 */
function createHttpError(error: AxiosError): HttpError {
  if (error.response) {
    const { status, data } = error.response
    let message = error.message

    // Extract error message from response data if available
    if (data && typeof data === 'object') {
      const errorData = data as Record<string, unknown>
      if (errorData.message && typeof errorData.message === 'string') {
        message = errorData.message
      } else if (errorData.error && typeof errorData.error === 'string') {
        message = errorData.error
      }
    }

    // Provide user-friendly messages for common status codes
    switch (status) {
      case 401:
        message = 'Unauthorized. Please log in again.'
        // Clear invalid token
        setAuthToken(null)
        break
      case 403:
        message = 'Forbidden. You do not have permission to access this resource.'
        break
      case 404:
        message = 'Resource not found.'
        break
      case 422:
        message = 'Validation error. Please check your input.'
        break
      case 429:
        message = 'Too many requests. Please try again later.'
        break
      case 500:
        message = 'Internal server error. Please try again later.'
        break
    }

    return new HttpError(message, status as number, data)
  }

  if (error.request) {
    return new HttpError('Network error. Please check your connection.', 0)
  }

  return new HttpError(error.message || 'An unexpected error occurred', 0)
}

export default axiosInstance