import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { signToken, verifyToken, decodeToken } from '../auth'

const TEST_SECRET = 'test-secret-key-for-testing-purposes-only-32chars'

describe('auth', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET
    process.env.JWT_EXPIRES_IN = '1h'
  })

  afterAll(() => {
    delete process.env.JWT_SECRET
    delete process.env.JWT_EXPIRES_IN
  })

  describe('signToken', () => {
    it('should generate a valid JWT token', async () => {
      const token = await signToken({ userId: 'user-123', email: 'test@example.com' })
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3)
    })
  })

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const token = await signToken({ userId: 'user-123', email: 'test@example.com' })
      const result = await verifyToken(token)

      expect(result.valid).toBe(true)
      if (result.valid) {
        expect(result.payload.userId).toBe('user-123')
        expect(result.payload.email).toBe('test@example.com')
      }
    })

    it('should reject an invalid token', async () => {
      const result = await verifyToken('invalid-token')
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toBeDefined()
      }
    })

    it('should reject a token with wrong signature', async () => {
      const token = await signToken({ userId: 'user-123' })
      const tamperedToken = token.slice(0, -5) + 'xxxxx'
      const result = await verifyToken(tamperedToken)
      expect(result.valid).toBe(false)
    })
  })

  describe('decodeToken', () => {
    it('should decode a valid token', async () => {
      const token = await signToken({ userId: 'user-456', email: 'decode@example.com' })
      const payload = await decodeToken(token)

      expect(payload).not.toBeNull()
      expect(payload?.userId).toBe('user-456')
      expect(payload?.email).toBe('decode@example.com')
    })

    it('should return null for an invalid token', async () => {
      const payload = await decodeToken('invalid-token')
      expect(payload).toBeNull()
    })
  })
})
