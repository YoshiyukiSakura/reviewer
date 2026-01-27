/**
 * Unit tests for reviews validators
 */

import {
  createReviewSchema,
  updateReviewSchema,
  reviewQuerySchema,
  reviewStatusSchema,
  reviewSourceTypeSchema,
} from '../reviews'

describe('reviews validators', () => {
  describe('reviewStatusSchema', () => {
    it('should accept valid statuses', () => {
      const validStatuses = ['PENDING', 'IN_PROGRESS', 'APPROVED', 'CHANGES_REQUESTED', 'CLOSED']
      validStatuses.forEach((status) => {
        const result = reviewStatusSchema.safeParse(status)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid statuses', () => {
      const result = reviewStatusSchema.safeParse('INVALID_STATUS')
      expect(result.success).toBe(false)
    })
  })

  describe('reviewSourceTypeSchema', () => {
    it('should accept valid source types', () => {
      const validTypes = ['pull_request', 'commit', 'file']
      validTypes.forEach((type) => {
        const result = reviewSourceTypeSchema.safeParse(type)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid source types', () => {
      const result = reviewSourceTypeSchema.safeParse('invalid_type')
      expect(result.success).toBe(false)
    })
  })

  describe('createReviewSchema', () => {
    it('should validate valid review data', () => {
      const validData = {
        title: 'Test Review',
        description: 'A test description',
        sourceType: 'pull_request' as const,
        sourceId: 'pr-123',
      }

      const result = createReviewSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.title).toBe('Test Review')
      }
    })

    it('should require title', () => {
      const result = createReviewSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('should reject empty title', () => {
      const result = createReviewSchema.safeParse({ title: '' })
      expect(result.success).toBe(false)
    })

    it('should reject title that is too long', () => {
      const result = createReviewSchema.safeParse({ title: 'x'.repeat(201) })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Title too long')
      }
    })

    it('should validate sourceUrl format', () => {
      const result = createReviewSchema.safeParse({
        title: 'Test',
        sourceUrl: 'not-a-url',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid source URL')
      }
    })

    it('should accept valid sourceUrl', () => {
      const result = createReviewSchema.safeParse({
        title: 'Test',
        sourceUrl: 'https://github.com/user/repo/pull/1',
      })
      expect(result.success).toBe(true)
    })

    it('should accept optional fields as undefined', () => {
      const result = createReviewSchema.safeParse({
        title: 'Test Review',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('updateReviewSchema', () => {
    it('should validate valid update data', () => {
      const validData = {
        title: 'Updated Title',
        description: 'Updated description',
        status: 'APPROVED' as const,
      }

      const result = updateReviewSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept empty object', () => {
      const result = updateReviewSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should update status', () => {
      const result = updateReviewSchema.safeParse({
        status: 'CHANGES_REQUESTED',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('CHANGES_REQUESTED')
      }
    })
  })

  describe('reviewQuerySchema', () => {
    it('should use default values', () => {
      const result = reviewQuerySchema.parse({})
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
      expect(result.sortBy).toBe('createdAt')
      expect(result.sortOrder).toBe('desc')
    })

    it('should parse page parameter', () => {
      const result = reviewQuerySchema.parse({ page: '5' })
      expect(result.page).toBe(5)
    })

    it('should reject invalid page', () => {
      const result = reviewQuerySchema.safeParse({ page: '-1' })
      expect(result.success).toBe(false)
    })

    it('should limit pageSize to 100', () => {
      const result = reviewQuerySchema.safeParse({ pageSize: '200' })
      expect(result.success).toBe(false)
    })

    it('should accept valid status filter', () => {
      const result = reviewQuerySchema.parse({ status: 'PENDING' })
      expect(result.status).toBe('PENDING')
    })

    it('should accept search parameter', () => {
      const result = reviewQuerySchema.parse({ search: 'test query' })
      expect(result.search).toBe('test query')
    })
  })
})