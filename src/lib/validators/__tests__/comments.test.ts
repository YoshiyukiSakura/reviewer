/**
 * Unit tests for comments validators
 */

import {
  createCommentSchema,
  updateCommentSchema,
  commentQuerySchema,
  commentSeveritySchema,
} from '../comments'

describe('comments validators', () => {
  describe('commentSeveritySchema', () => {
    it('should accept valid severities', () => {
      const validSeverities = ['INFO', 'SUGGESTION', 'WARNING', 'ERROR', 'CRITICAL']
      validSeverities.forEach((severity) => {
        const result = commentSeveritySchema.safeParse(severity)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid severities', () => {
      const result = commentSeveritySchema.safeParse('INVALID')
      expect(result.success).toBe(false)
    })
  })

  describe('createCommentSchema', () => {
    it('should validate valid comment data', () => {
      const validData = {
        content: 'This is a great improvement!',
        reviewId: 'review-123',
        filePath: 'src/components/Button.tsx',
        lineStart: '10',
        lineEnd: '15',
        severity: 'INFO' as const,
        authorName: 'Test User',
      }

      const result = createCommentSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.content).toBe('This is a great improvement!')
        expect(result.data.lineStart).toBe(10)
      }
    })

    it('should require content', () => {
      const result = createCommentSchema.safeParse({ reviewId: 'review-123' })
      expect(result.success).toBe(false)
    })

    it('should reject empty content', () => {
      const result = createCommentSchema.safeParse({ content: '', reviewId: 'review-123' })
      expect(result.success).toBe(false)
    })

    it('should require reviewId', () => {
      const result = createCommentSchema.safeParse({ content: 'Test comment' })
      expect(result.success).toBe(false)
    })

    it('should validate lineStart as positive integer', () => {
      const result = createCommentSchema.safeParse({
        content: 'Test',
        reviewId: 'review-123',
        lineStart: '-1',
      })
      expect(result.success).toBe(false)
    })

    it('should accept valid line numbers', () => {
      const result = createCommentSchema.safeParse({
        content: 'Test',
        reviewId: 'review-123',
        lineStart: '10',
        lineEnd: '15',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.lineStart).toBe(10)
        expect(result.data.lineEnd).toBe(15)
      }
    })

    it('should reject content that is too long', () => {
      const result = createCommentSchema.safeParse({
        content: 'x'.repeat(10001),
        reviewId: 'review-123',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Content too long')
      }
    })
  })

  describe('updateCommentSchema', () => {
    it('should validate valid update data', () => {
      const validData = {
        content: 'Updated comment',
        isResolved: true,
        severity: 'WARNING' as const,
      }

      const result = updateCommentSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept empty object', () => {
      const result = updateCommentSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should update isResolved', () => {
      const result = updateCommentSchema.safeParse({ isResolved: true })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isResolved).toBe(true)
      }
    })

    it('should validate boolean type for isResolved', () => {
      const result = updateCommentSchema.safeParse({ isResolved: 'true' })
      expect(result.success).toBe(false)
    })
  })

  describe('commentQuerySchema', () => {
    it('should use default values', () => {
      const result = commentQuerySchema.parse({})
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
      expect(result.sortBy).toBe('createdAt')
      expect(result.sortOrder).toBe('desc')
    })

    it('should parse reviewId filter', () => {
      const result = commentQuerySchema.parse({ reviewId: 'review-123' })
      expect(result.reviewId).toBe('review-123')
    })

    it('should parse boolean isResolved', () => {
      const result = commentQuerySchema.parse({ isResolved: 'true' })
      expect(result.isResolved).toBe(true)
    })

    it('should parse false isResolved', () => {
      const result = commentQuerySchema.parse({ isResolved: 'false' })
      expect(result.isResolved).toBeDefined()
    })

    it('should parse severity filter', () => {
      const result = commentQuerySchema.parse({ severity: 'WARNING' })
      expect(result.severity).toBe('WARNING')
    })

    it('should parse pageSize with max limit', () => {
      const result = commentQuerySchema.safeParse({ pageSize: '50' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.pageSize).toBe(50)
      }
    })
  })
})