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
import { setAuthToken, getAuthToken } from '@/lib/http/client'
import { verifyToken, decodeToken, type TokenPayload } from '@/lib/auth'

/**
 * Auth context interface
 */
export interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
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
    setIsLoading(true)
    try {
      // In a real app, this would call the API
      // For now, we'll simulate a login by decoding the token
      // The actual implementation would be:
      // const response = await axiosInstance.post<AuthResponse>('/auth/login', credentials)
      // setAuthToken(response.data.token)
      // setUser(response.data.user)

      // Simulating API call for demonstration
      const mockResponse: AuthResponse = {
        user: {
          id: 'user-1',
          email: credentials.email,
          name: 'Test User',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        token: 'mock-jwt-token',
      }

      setAuthToken(mockResponse.token)
      setUser(mockResponse.user)
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
    login,
    logout,
    refreshUser,
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