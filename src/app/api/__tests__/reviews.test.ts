import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Mock dependencies at module level
jest.mock('@/lib/auth', () => ({
  signToken: jest.fn(),
  verifyToken: jest.fn(),
  decodeToken: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    review: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}))

// Set environment variables
beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-testing'
  process.env.JWT_EXPIRES_IN = '1h'
})

// Helper to create mock request
function createMockRequest(url: string, options: RequestInit = {}): Request {
  return new Request(`http://localhost${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

describe('Reviews API', () => {
  const mockUserPayload = { userId: 'user-1', email: 'test@example.com' }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(verifyToken as jest.Mock).mockResolvedValue({ valid: true, payload: mockUserPayload })
  })

  describe('GET /api/reviews', () => {
    it('should return paginated reviews', async () => {
      const mockReviews = [
        { id: 'review-1', title: 'Review 1', comments: [] },
        { id: 'review-2', title: 'Review 2', comments: [] },
      ]
      ;(prisma.review.findMany as jest.Mock).mockResolvedValue(mockReviews)
      ;(prisma.review.count as jest.Mock).mockResolvedValue(10)

      const { GET } = await import('../reviews/route')
      const request = createMockRequest('/api/reviews?page=1&pageSize=2')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.items).toHaveLength(2)
      expect(data.total).toBe(10)
    })

    it('should filter by status', async () => {
      ;(prisma.review.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.review.count as jest.Mock).mockResolvedValue(0)

      const { GET } = await import('../reviews/route')
      const request = createMockRequest('/api/reviews?status=APPROVED')
      await GET(request)

      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'APPROVED' }),
        })
      )
    })

    it('should return 400 for invalid query parameters', async () => {
      const { GET } = await import('../reviews/route')
      const request = createMockRequest('/api/reviews?page=-1')
      const response = await GET(request)

      expect(response.status).toBe(400)
    })

    it('should return 500 on database error', async () => {
      ;(prisma.review.findMany as jest.Mock).mockRejectedValue(new Error('DB error'))

      const { GET } = await import('../reviews/route')
      const request = createMockRequest('/api/reviews')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('POST /api/reviews', () => {
    it('should return 401 without authorization', async () => {
      ;(verifyToken as jest.Mock).mockResolvedValue({ valid: false })

      const { POST } = await import('../reviews/route')
      const request = createMockRequest('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test', description: 'Test' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should create review and return 201', async () => {
      ;(prisma.review.create as jest.Mock).mockResolvedValue({
        id: 'review-1',
        title: 'New Review',
        description: 'Description',
        sourceType: 'github',
        sourceId: 'pr-123',
        authorId: 'user-1',
        status: 'PENDING',
      })

      const { POST } = await import('../reviews/route')
      const request = createMockRequest('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Review',
          description: 'Description',
          sourceType: 'github',
          sourceId: 'pr-123',
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe('review-1')
    })

    it('should return 400 for missing required fields', async () => {
      const { POST } = await import('../reviews/route')
      const request = createMockRequest('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/reviews/[id]', () => {
    it('should return 404 for non-existent review', async () => {
      ;(prisma.review.findUnique as jest.Mock).mockResolvedValue(null)

      const mod = await import('../reviews/[id]/route')
      const { GET } = mod
      const request = createMockRequest('/api/reviews/non-existent-id')
      const params = Promise.resolve({ id: 'non-existent-id' })
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Review not found')
    })

    it('should return review with comments', async () => {
      const mockReview = {
        id: 'review-1',
        title: 'Test Review',
        comments: [{ id: 'comment-1', content: 'Comment 1' }],
      }
      ;(prisma.review.findUnique as jest.Mock).mockResolvedValue(mockReview)

      const mod = await import('../reviews/[id]/route')
      const { GET } = mod
      const request = createMockRequest('/api/reviews/review-1')
      const params = Promise.resolve({ id: 'review-1' })
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('review-1')
      expect(data.comments).toHaveLength(1)
    })
  })

  describe('PATCH /api/reviews/[id]', () => {
    it('should update review and return 200', async () => {
      ;(prisma.review.findUnique as jest.Mock).mockResolvedValue({
        id: 'review-1',
        title: 'Original',
      })
      ;(prisma.review.update as jest.Mock).mockResolvedValue({
        id: 'review-1',
        title: 'Updated',
        status: 'APPROVED',
      })

      const mod = await import('../reviews/[id]/route')
      const { PATCH } = mod
      const request = createMockRequest('/api/reviews/review-1', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated', status: 'APPROVED' }),
      })
      const params = Promise.resolve({ id: 'review-1' })
      const response = await PATCH(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe('Updated')
    })

    it('should return 400 for invalid update data', async () => {
      ;(prisma.review.findUnique as jest.Mock).mockResolvedValue({
        id: 'review-1',
        title: 'Original',
      })

      const mod = await import('../reviews/[id]/route')
      const { PATCH } = mod
      const request = createMockRequest('/api/reviews/review-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'INVALID_STATUS' }),
      })
      const params = Promise.resolve({ id: 'review-1' })
      const response = await PATCH(request, { params })

      expect(response.status).toBe(400)
    })
  })

  describe('DELETE /api/reviews/[id]', () => {
    it('should delete review and return success message', async () => {
      ;(prisma.review.findUnique as jest.Mock).mockResolvedValue({
        id: 'review-1',
        title: 'To Delete',
      })
      ;(prisma.review.delete as jest.Mock).mockResolvedValue({ id: 'review-1' })

      const mod = await import('../reviews/[id]/route')
      const { DELETE } = mod
      const request = createMockRequest('/api/reviews/review-1', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'review-1' })
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Review deleted successfully')
    })
  })
})