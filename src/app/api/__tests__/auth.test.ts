import { hash } from 'bcryptjs'
import { signToken, verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Mock dependencies at module level
jest.mock('@/lib/auth', () => ({
  signToken: jest.fn(),
  verifyToken: jest.fn(),
  decodeToken: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

// Set environment variables
beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-testing'
  process.env.JWT_EXPIRES_IN = '1h'
})

// Helper to create mock request
function createMockRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/login', () => {
    it('should return 401 for non-existent user', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(signToken as jest.Mock).mockResolvedValue('mock-token')

      const { POST } = await import('../auth/login/route')
      const request = createMockRequest({ email: 'test@example.com', password: 'password123' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid email or password')
    })

    it('should return 401 for user without password', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: null,
      })
      ;(signToken as jest.Mock).mockResolvedValue('mock-token')

      const { POST } = await import('../auth/login/route')
      const request = createMockRequest({ email: 'test@example.com', password: 'password123' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('This account does not have a password set')
    })

    it('should return 401 for invalid password', async () => {
      const hashedPassword = await hash('correct-password', 12)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
      })
      ;(signToken as jest.Mock).mockResolvedValue('mock-token')

      const { POST } = await import('../auth/login/route')
      const request = createMockRequest({ email: 'test@example.com', password: 'wrong-password' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid email or password')
    })

    it('should return token and user on successful login', async () => {
      const hashedPassword = await hash('password123', 12)
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
      }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(signToken as jest.Mock).mockResolvedValue('mock-token')

      const { POST } = await import('../auth/login/route')
      const request = createMockRequest({ email: 'test@example.com', password: 'password123' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.token).toBe('mock-token')
      expect(data.user.id).toBe('user-1')
      expect(data.user.email).toBe('test@example.com')
      expect(data.user.name).toBe('Test User')
    })

    it('should return 400 for invalid request body', async () => {
      ;(signToken as jest.Mock).mockResolvedValue('mock-token')

      const { POST } = await import('../auth/login/route')
      const request = createMockRequest({ email: 'invalid-email' })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should return 400 for missing email', async () => {
      ;(signToken as jest.Mock).mockResolvedValue('mock-token')

      const { POST } = await import('../auth/login/route')
      const request = createMockRequest({ password: 'password123' })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should return 500 on database error', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'))
      ;(signToken as jest.Mock).mockResolvedValue('mock-token')

      const { POST } = await import('../auth/login/route')
      const request = createMockRequest({ email: 'test@example.com', password: 'password123' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('POST /api/auth/register', () => {
    function createRegisterRequest(body: Record<string, unknown>): Request {
      return new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }

    it('should return 409 if user already exists', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com',
      })

      const { POST } = await import('../auth/register/route')
      const request = createRegisterRequest({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('User with this email already exists')
    })

    it('should create user with name and return 201', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new-user',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
      })

      const { POST } = await import('../auth/register/route')
      const request = createRegisterRequest({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.user.id).toBe('new-user')
      expect(data.user.email).toBe('test@example.com')
      expect(data.user.name).toBe('Test User')
    })

    it('should create user without name and use email prefix', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new-user',
        email: 'testuser@example.com',
        name: 'testuser',
        createdAt: new Date(),
      })

      const { POST } = await import('../auth/register/route')
      const request = createRegisterRequest({
        email: 'testuser@example.com',
        password: 'password123',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'testuser@example.com',
            name: 'testuser',
          }),
        })
      )
    })

    it('should return 400 for invalid email', async () => {
      const { POST } = await import('../auth/register/route')
      const request = createRegisterRequest({
        email: 'invalid-email',
        password: 'password123',
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should return 400 for short password', async () => {
      const { POST } = await import('../auth/register/route')
      const request = createRegisterRequest({
        email: 'test@example.com',
        password: 'short',
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should return 500 on database error', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'))

      const { POST } = await import('../auth/register/route')
      const request = createRegisterRequest({
        email: 'test@example.com',
        password: 'password123',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})