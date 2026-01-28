/**
 * HTTP client configuration utilities
 * Reads environment variables for base URL, timeout, and other settings
 */

export interface HttpClientConfig {
  baseURL: string
  timeout: number
  withCredentials: boolean
}

/**
 * Get the API base URL from environment variables
 * Falls back to basePath + /api for same-origin API requests
 */
export function getBaseURL(): string {
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  // Default to basePath + /api for Next.js apps
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/reviewer'
  return `${basePath}/api`
}

/**
 * Get the request timeout in milliseconds
 * Default: 10000ms (10 seconds)
 */
export function getTimeout(): number {
  const timeout = parseInt(process.env.API_TIMEOUT || '10000', 10)
  return isNaN(timeout) ? 10000 : timeout
}

/**
 * Get whether to send credentials (cookies) with requests
 * Default: false
 */
export function getWithCredentials(): boolean {
  return process.env.API_WITH_CREDENTIALS === 'true'
}

/**
 * Get the full HTTP client configuration
 */
export function getHttpClientConfig(): HttpClientConfig {
  return {
    baseURL: getBaseURL(),
    timeout: getTimeout(),
    withCredentials: getWithCredentials(),
  }
}