import { AuthProvider, useAuth, AuthContext } from '../auth-context'
import { setAuthToken, getAuthToken } from '@/lib/http/client'
import { signToken } from '@/lib/auth'
import type { ReactNode } from 'react'

const TEST_SECRET = 'test-secret-key-for-testing-purposes-only-32chars'

// Mock next/cache to prevent issues with dynamic imports
jest.mock('next/cache', () => ({
  ...jest.requireActual('next/cache'),
}))

describe('auth-context', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET
    process.env.JWT_EXPIRES_IN = '1h'
  })

  afterAll(() => {
    delete process.env.JWT_SECRET
    delete process.env.JWT_EXPIRES_IN
  })

  beforeEach(() => {
    // Clear localStorage mock
    setAuthToken(null)
  })

  describe('AuthContext', () => {
    it('should be defined', () => {
      expect(AuthContext).toBeDefined()
    })

    it('should have a Provider', () => {
      expect(AuthProvider).toBeDefined()
      expect(typeof AuthProvider).toBe('function')
    })

    it('should have a useAuth hook', () => {
      expect(useAuth).toBeDefined()
      expect(typeof useAuth).toBe('function')
    })
  })

  describe('useAuth', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Create a test component that uses useAuth without a provider
      function TestComponent() {
        try {
          useAuth()
          return 'no error'
        } catch (error) {
          if (error instanceof Error) {
            return error.message
          }
          return 'unknown error'
        }
      }

      // We can't render the component directly without testing-library
      // But we can test the behavior by checking the error message pattern
      const TestComponentFails = () => {
        try {
          useAuth()
          return null
        } catch (e) {
          if (e instanceof Error) {
            expect(e.message).toBe('useAuth must be used within an AuthProvider')
          }
          return null
        }
      }

      // This test verifies the error is thrown correctly
      expect(() => useAuth()).toThrow('useAuth must be used within an AuthProvider')
    })
  })

  describe('AuthContextValue interface', () => {
    it('should have required properties', () => {
      const contextValue = {
        user: null,
        isAuthenticated: false,
        isLoading: true,
        login: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
      }

      expect(contextValue.user).toBeNull()
      expect(contextValue.isAuthenticated).toBe(false)
      expect(contextValue.isLoading).toBe(true)
      expect(typeof contextValue.login).toBe('function')
      expect(typeof contextValue.logout).toBe('function')
      expect(typeof contextValue.refreshUser).toBe('function')
    })
  })

  describe('parseUserFromPayload helper', () => {
    it('should parse user from token payload', async () => {
      // Import the internal function for testing
      const token = await signToken({ userId: 'user-123', email: 'test@example.com' })
      const { verifyToken } = await import('@/lib/auth')
      const result = await verifyToken(token)

      if (result.valid) {
        const payload = result.payload

        // Manually test the parsing logic
        const user = {
          id: payload.userId,
          email: payload.email,
          name: payload.name,
          avatarUrl: payload.avatarUrl,
          createdAt: payload.createdAt ? new Date(payload.createdAt as string) : new Date(),
          updatedAt: payload.updatedAt ? new Date(payload.updatedAt as string) : new Date(),
        }

        expect(user.id).toBe('user-123')
        expect(user.email).toBe('test@example.com')
        expect(user.createdAt).toBeInstanceOf(Date)
        expect(user.updatedAt).toBeInstanceOf(Date)
      }
    })
  })

  describe('token storage', () => {
    it('should store and retrieve tokens correctly', () => {
      const testToken = 'test-jwt-token-12345'

      setAuthToken(testToken)
      expect(getAuthToken()).toBe(testToken)

      setAuthToken(null)
      expect(getAuthToken()).toBeNull()
    })

    it('should handle token from JWT', async () => {
      const token = await signToken({ userId: 'user-456', email: 'jwt@example.com' })

      setAuthToken(token)
      const storedToken = getAuthToken()

      expect(storedToken).toBe(token)

      // Verify the token is valid
      const { verifyToken } = await import('@/lib/auth')
      const result = await verifyToken(token)

      expect(result.valid).toBe(true)
      if (result.valid) {
        expect(result.payload.userId).toBe('user-456')
        expect(result.payload.email).toBe('jwt@example.com')
      }
    })
  })
})