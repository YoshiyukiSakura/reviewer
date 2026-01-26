import { registerSchema, loginSchema } from '../auth'

describe('auth validators', () => {
  describe('registerSchema', () => {
    it('should validate a valid registration input', () => {
      const validInput = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      }

      const result = registerSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should validate registration without name', () => {
      const validInput = {
        email: 'test@example.com',
        password: 'password123',
      }

      const result = registerSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const invalidInput = {
        email: 'not-an-email',
        password: 'password123',
      }

      const result = registerSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('should reject short password', () => {
      const invalidInput = {
        email: 'test@example.com',
        password: 'short',
      }

      const result = registerSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('should reject empty email', () => {
      const invalidInput = {
        email: '',
        password: 'password123',
      }

      const result = registerSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
  })

  describe('loginSchema', () => {
    it('should validate a valid login input', () => {
      const validInput = {
        email: 'test@example.com',
        password: 'password123',
      }

      const result = loginSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const invalidInput = {
        email: 'not-an-email',
        password: 'password123',
      }

      const result = loginSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('should reject empty password', () => {
      const invalidInput = {
        email: 'test@example.com',
        password: '',
      }

      const result = loginSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
  })
})