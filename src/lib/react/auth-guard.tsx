'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from './auth-context'

/**
 * Auth guard props
 */
export interface AuthGuardProps {
  children: ReactNode
  /**
   * Paths that don't require authentication
   * @default ['/login', '/register']
   */
  publicPaths?: string[]
  /**
   * Redirect path for unauthenticated users
   * @default '/login'
   */
  loginPath?: string
  /**
   * Loading component to display while checking auth state
   */
  loadingComponent?: ReactNode
}

/**
 * Authentication guard component for protecting routes
 *
 * Redirects unauthenticated users to the login page and
 * allows configuration of public paths that don't require authentication.
 *
 * @example
 * ```tsx
 * // Basic usage - protect all routes except /login and /register
 * <AuthGuard>
 *   <Dashboard />
 * </AuthGuard>
 *
 * // Custom public paths
 * <AuthGuard publicPaths={['/login', '/register', '/about']}>
 *   <Dashboard />
 * </AuthGuard>
 *
 * // Custom login path
 * <AuthGuard loginPath="/auth/signin">
 *   <Dashboard />
 * </AuthGuard>
 * ```
 */
export function AuthGuard({
  children,
  publicPaths = ['/login', '/register'],
  loginPath = '/login',
  loadingComponent,
}: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Don't redirect if still loading or if on a public path
    if (isLoading) {
      return
    }

    const isPublicPath = publicPaths.some((path) => {
      // Exact match
      if (pathname === path) {
        return true
      }
      // Handle wildcard paths (e.g., '/api/*')
      if (path.endsWith('/*')) {
        const basePath = path.slice(0, -2)
        return pathname.startsWith(basePath)
      }
      return false
    })

    if (!isAuthenticated && !isPublicPath) {
      // Preserve the original URL for redirect after login
      const redirectUrl = pathname
      const loginUrl = `${loginPath}?redirect=${encodeURIComponent(redirectUrl)}`
      router.replace(loginUrl)
    }
  }, [isAuthenticated, isLoading, pathname, publicPaths, loginPath, router])

  // Show loading component while checking auth state
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>
    }
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        Loading...
      </div>
    )
  }

  // If authenticated or on a public path, render children
  if (isAuthenticated || publicPaths.some((path) => pathname === path)) {
    return <>{children}</>
  }

  // Redirecting - return null to avoid flash of content
  return null
}

export default AuthGuard