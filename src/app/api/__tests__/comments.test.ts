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
    reviewComment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    review: {
      findUnique: jest.fn(),
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

describe('Comments API', () => {
  const mockUserPayload = { userId: 'user-1', email: 'test@example.com' }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(verifyToken as jest.Mock).mockResolvedValue({ valid: true, payload: mockUserPayload })
  })

  describe('GET /api/comments', () => {
    it('should return paginated comments', async () => {
      const mockComments = [
        { id: 'comment-1', content: 'Comment 1', _count: { replies: 2 } },
        { id: 'comment-2', content: 'Comment 2', _count: { replies: 0 } },
      ]
      ;(prisma.reviewComment.findMany as jest.Mock).mockResolvedValue(mockComments)
      ;(prisma.reviewComment.count as jest.Mock).mockResolvedValue(10)

      const { GET } = await import('../comments/route')
      const request = createMockRequest('/api/comments?page=1&pageSize=2')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.items).toHaveLength(2)
      expect(data.total).toBe(10)
    })

    it('should filter by reviewId', async () => {
      ;(prisma.reviewComment.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.reviewComment.count as jest.Mock).mockResolvedValue(0)

      const { GET } = await import('../comments/route')
      const request = createMockRequest('/api/comments?reviewId=review-123')
      await GET(request)

      expect(prisma.reviewComment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ reviewId: 'review-123' }),
        })
      )
    })

    it('should return 400 for invalid query parameters', async () => {
      const { GET } = await import('../comments/route')
      const request = createMockRequest('/api/comments?page=-1')
      const response = await GET(request)

      expect(response.status).toBe(400)
    })

    it('should return 500 on database error', async () => {
      ;(prisma.reviewComment.findMany as jest.Mock).mockRejectedValue(new Error('DB error'))

      const { GET } = await import('../comments/route')
      const request = createMockRequest('/api/comments')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('POST /api/comments', () => {
    it('should create comment and return 201', async () => {
      ;(prisma.review.findUnique as jest.Mock).mockResolvedValue({ id: 'review-1' })
      ;(prisma.reviewComment.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.reviewComment.create as jest.Mock).mockResolvedValue({
        id: 'comment-1',
        content: 'Test comment',
        reviewId: 'review-1',
        authorId: 'user-1',
        severity: 'INFO',
        isResolved: false,
      })

      const { POST } = await import('../comments/route')
      const request = createMockRequest('/api/comments', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Test comment',
          reviewId: 'review-1',
          severity: 'INFO',
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe('comment-1')
    })

    it('should return 400 for missing required fields', async () => {
      const { POST } = await import('../comments/route')
      const request = createMockRequest('/api/comments', {
        method: 'POST',
        body: JSON.stringify({ reviewId: 'review-1' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/comments/[id]', () => {
    it('should return 404 for non-existent comment', async () => {
      ;(prisma.reviewComment.findUnique as jest.Mock).mockResolvedValue(null)

      const mod = await import('../comments/[id]/route')
      const { GET } = mod
      const request = createMockRequest('/api/comments/non-existent-id')
      const params = Promise.resolve({ id: 'non-existent-id' })
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Comment not found')
    })

    it('should return comment with review and replies', async () => {
      const mockComment = {
        id: 'comment-1',
        content: 'Test comment',
        review: { id: 'review-1', title: 'Test Review' },
        parent: { id: 'parent-1', content: 'Parent', authorName: 'User' },
        replies: [{ id: 'reply-1', content: 'Reply' }],
        _count: { replies: 1 },
      }
      ;(prisma.reviewComment.findUnique as jest.Mock).mockResolvedValue(mockComment)

      const mod = await import('../comments/[id]/route')
      const { GET } = mod
      const request = createMockRequest('/api/comments/comment-1')
      const params = Promise.resolve({ id: 'comment-1' })
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('comment-1')
      expect(data.review.title).toBe('Test Review')
    })
  })

  describe('PUT /api/comments/[id]', () => {
    it('should update comment content', async () => {
      ;(prisma.reviewComment.findUnique as jest.Mock).mockResolvedValue({
        id: 'comment-1',
        content: 'Original',
      })
      ;(prisma.reviewComment.update as jest.Mock).mockResolvedValue({
        id: 'comment-1',
        content: 'Updated content',
      })

      const mod = await import('../comments/[id]/route')
      const { PUT } = mod
      const request = createMockRequest('/api/comments/comment-1', {
        method: 'PUT',
        body: JSON.stringify({ content: 'Updated content' }),
      })
      const params = Promise.resolve({ id: 'comment-1' })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.content).toBe('Updated content')
    })

    it('should update comment isResolved', async () => {
      ;(prisma.reviewComment.findUnique as jest.Mock).mockResolvedValue({
        id: 'comment-1',
        isResolved: false,
      })
      ;(prisma.reviewComment.update as jest.Mock).mockResolvedValue({
        id: 'comment-1',
        isResolved: true,
      })

      const mod = await import('../comments/[id]/route')
      const { PUT } = mod
      const request = createMockRequest('/api/comments/comment-1', {
        method: 'PUT',
        body: JSON.stringify({ isResolved: true }),
      })
      const params = Promise.resolve({ id: 'comment-1' })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isResolved).toBe(true)
    })
  })

  describe('DELETE /api/comments/[id]', () => {
    it('should delete comment and return success message', async () => {
      ;(prisma.reviewComment.findUnique as jest.Mock).mockResolvedValue({
        id: 'comment-1',
        content: 'To Delete',
      })
      ;(prisma.reviewComment.delete as jest.Mock).mockResolvedValue({ id: 'comment-1' })

      const mod = await import('../comments/[id]/route')
      const { DELETE } = mod
      const request = createMockRequest('/api/comments/comment-1', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'comment-1' })
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Comment deleted successfully')
    })
  })
})