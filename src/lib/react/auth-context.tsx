'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { type User, type LoginCredentials, type AuthResponse } from '@/types'
import { setAuthToken, getAuthToken, axiosInstance, HttpError } from '@/lib/http/client'
import { verifyToken, decodeToken, type TokenPayload } from '@/lib/auth'

/**
 * Auth context interface
 */
export interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  clearError: () => void
}

/**
 * Create the Auth context
 */
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * Parse user from token payload
 */
function parseUserFromPayload(payload: TokenPayload): User {
  return {
    id: payload.userId,
    email: payload.email,
    name: payload.name,
    avatarUrl: payload.avatarUrl,
    createdAt: payload.createdAt ? new Date(payload.createdAt as string) : new Date(),
    updatedAt: payload.updatedAt ? new Date(payload.updatedAt as string) : new Date(),
  }
}

/**
 * Auth provider props
 */
interface AuthProviderProps {
  children: ReactNode
}

/**
 * Auth provider component
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Initialize auth state from stored token
   */
  const initializeAuth = useCallback(async () => {
    try {
      const token = getAuthToken()
      if (!token) {
        setIsLoading(false)
        return
      }

      const result = await verifyToken(token)
      if (result.valid) {
        setUser(parseUserFromPayload(result.payload))
      } else {
        setAuthToken(null)
      }
    } catch {
      setAuthToken(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Login function
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    setError(null)
    setIsLoading(true)
    try {
      const response = await axiosInstance.post<AuthResponse>('/api/auth/login', credentials)
      const { token, user: userData } = response.data

      setAuthToken(token)
      setUser(userData)
    } catch (err) {
      if (err instanceof HttpError) {
        setError(err.message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred during login')
      }
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Logout function
   */
  const logout = useCallback(() => {
    setAuthToken(null)
    setUser(null)
    setError(null)
  }, [])

  /**
   * Clear error function
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Refresh user from token
   */
  const refreshUser = useCallback(async () => {
    const token = getAuthToken()
    if (!token) {
      setUser(null)
      return
    }

    const result = await verifyToken(token)
    if (result.valid) {
      setUser(parseUserFromPayload(result.payload))
    } else {
      setAuthToken(null)
      setUser(null)
    }
  }, [])

  /**
   * Initialize auth on mount
   */
  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    logout,
    refreshUser,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Use the auth context
 * @throws Error if used outside of AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext