/**
 * Unit tests for stats validators
 */

import { statsQuerySchema } from '../stats'

describe('stats validators', () => {
  describe('statsQuerySchema', () => {
    it('should accept empty object', () => {
      const result = statsQuerySchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should parse valid datetime for startDate', () => {
      const result = statsQuerySchema.safeParse({
        startDate: '2024-01-01T00:00:00Z',
      })
      expect(result.success).toBe(true)
    })

    it('should parse valid datetime for endDate', () => {
      const result = statsQuerySchema.safeParse({
        endDate: '2024-12-31T23:59:59Z',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid datetime format', () => {
      const result = statsQuerySchema.safeParse({
        startDate: 'not-a-datetime',
      })
      expect(result.success).toBe(false)
    })

    it('should accept both dates', () => {
      const result = statsQuerySchema.safeParse({
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.startDate).toBe('2024-01-01T00:00:00Z')
        expect(result.data.endDate).toBe('2024-12-31T23:59:59Z')
      }
    })
  })
})