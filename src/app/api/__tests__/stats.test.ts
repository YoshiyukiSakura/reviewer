import { prisma } from '@/lib/prisma'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    review: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    reviewComment: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
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

describe('Stats API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/stats', () => {
    it('should return review and comment statistics', async () => {
      ;(prisma.review.groupBy as jest.Mock).mockResolvedValue([
        { status: 'PENDING', _count: { id: 5 } },
        { status: 'APPROVED', _count: { id: 10 } },
        { status: 'REJECTED', _count: { id: 2 } },
      ])
      ;(prisma.reviewComment.count as jest.Mock)
        .mockResolvedValueOnce(20) // total comments
        .mockResolvedValueOnce(5) // unresolved comments
      ;(prisma.reviewComment.groupBy as jest.Mock).mockResolvedValue([
        { severity: 'INFO', _count: { id: 8 } },
        { severity: 'WARNING', _count: { id: 4 } },
        { severity: 'ERROR', _count: { id: 3 } },
      ])
      ;(prisma.review.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.reviewComment.findMany as jest.Mock).mockResolvedValue([])

      const { GET } = await import('../stats/route')
      const request = createMockRequest('/api/stats')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.reviews.total).toBe(17)
      expect(data.reviews.PENDING).toBe(5)
      expect(data.reviews.APPROVED).toBe(10)
      expect(data.reviews.REJECTED).toBe(2)
      expect(data.comments.total).toBe(20)
      expect(data.comments.unresolved).toBe(5)
      expect(data.comments.bySeverity.INFO).toBe(8)
      expect(data.comments.bySeverity.WARNING).toBe(4)
    })

    it('should return zero counts when no data exists', async () => {
      ;(prisma.review.groupBy as jest.Mock).mockResolvedValue([])
      ;(prisma.reviewComment.count as jest.Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
      ;(prisma.reviewComment.groupBy as jest.Mock).mockResolvedValue([])
      ;(prisma.review.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.reviewComment.findMany as jest.Mock).mockResolvedValue([])

      const { GET } = await import('../stats/route')
      const request = createMockRequest('/api/stats')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.reviews.total).toBe(0)
      expect(data.comments.total).toBe(0)
      expect(data.comments.unresolved).toBe(0)
    })

    it('should include all review statuses in response', async () => {
      ;(prisma.review.groupBy as jest.Mock).mockResolvedValue([
        { status: 'PENDING', _count: { id: 1 } },
      ])
      ;(prisma.reviewComment.count as jest.Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
      ;(prisma.reviewComment.groupBy as jest.Mock).mockResolvedValue([])
      ;(prisma.review.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.reviewComment.findMany as jest.Mock).mockResolvedValue([])

      const { GET } = await import('../stats/route')
      const request = createMockRequest('/api/stats')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.reviews).toHaveProperty('PENDING')
      expect(data.reviews).toHaveProperty('IN_PROGRESS')
      expect(data.reviews).toHaveProperty('APPROVED')
      expect(data.reviews).toHaveProperty('REJECTED')
      expect(data.reviews).toHaveProperty('CHANGES_REQUESTED')
      expect(data.reviews).toHaveProperty('CLOSED')
    })

    it('should include all severity levels in response', async () => {
      ;(prisma.review.groupBy as jest.Mock).mockResolvedValue([])
      ;(prisma.reviewComment.count as jest.Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
      ;(prisma.reviewComment.groupBy as jest.Mock).mockResolvedValue([])
      ;(prisma.review.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.reviewComment.findMany as jest.Mock).mockResolvedValue([])

      const { GET } = await import('../stats/route')
      const request = createMockRequest('/api/stats')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.comments.bySeverity).toHaveProperty('INFO')
      expect(data.comments.bySeverity).toHaveProperty('SUGGESTION')
      expect(data.comments.bySeverity).toHaveProperty('WARNING')
      expect(data.comments.bySeverity).toHaveProperty('ERROR')
      expect(data.comments.bySeverity).toHaveProperty('CRITICAL')
    })

    it('should return activity over time data', async () => {
      ;(prisma.review.groupBy as jest.Mock).mockResolvedValue([])
      ;(prisma.reviewComment.count as jest.Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
      ;(prisma.reviewComment.groupBy as jest.Mock).mockResolvedValue([])
      ;(prisma.review.findMany as jest.Mock).mockResolvedValue([
        { createdAt: new Date('2024-01-15') },
        { createdAt: new Date('2024-01-15') },
      ])
      ;(prisma.reviewComment.findMany as jest.Mock).mockResolvedValue([
        { createdAt: new Date('2024-01-15') },
      ])

      const { GET } = await import('../stats/route')
      const request = createMockRequest('/api/stats')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.activityOverTime).toBeDefined()
      expect(Array.isArray(data.activityOverTime)).toBe(true)
    })

    it('should return 400 for invalid date format', async () => {
      const { GET } = await import('../stats/route')
      const request = createMockRequest('/api/stats?startDate=invalid-date')
      const response = await GET(request)

      expect(response.status).toBe(400)
    })

    it('should return 500 on database error', async () => {
      ;(prisma.review.groupBy as jest.Mock).mockRejectedValue(new Error('DB error'))

      const { GET } = await import('../stats/route')
      const request = createMockRequest('/api/stats')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle unknown review statuses gracefully', async () => {
      ;(prisma.review.groupBy as jest.Mock).mockResolvedValue([
        { status: 'UNKNOWN_STATUS', _count: { id: 5 } },
      ])
      ;(prisma.reviewComment.count as jest.Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
      ;(prisma.reviewComment.groupBy as jest.Mock).mockResolvedValue([])
      ;(prisma.review.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.reviewComment.findMany as jest.Mock).mockResolvedValue([])

      const { GET } = await import('../stats/route')
      const request = createMockRequest('/api/stats')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Unknown status should not affect known statuses
      expect(data.reviews.PENDING).toBe(0)
      expect(data.reviews.APPROVED).toBe(0)
    })

    it('should handle unknown severity levels gracefully', async () => {
      ;(prisma.review.groupBy as jest.Mock).mockResolvedValue([])
      ;(prisma.reviewComment.count as jest.Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
      ;(prisma.reviewComment.groupBy as jest.Mock).mockResolvedValue([
        { severity: 'UNKNOWN_SEVERITY', _count: { id: 5 } },
      ])
      ;(prisma.review.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.reviewComment.findMany as jest.Mock).mockResolvedValue([])

      const { GET } = await import('../stats/route')
      const request = createMockRequest('/api/stats')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Unknown severity should not affect known severities
      expect(data.comments.bySeverity.INFO).toBe(0)
      expect(data.comments.bySeverity.ERROR).toBe(0)
    })
  })
})