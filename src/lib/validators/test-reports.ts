import { z } from 'zod'

export const recommendationTypeSchema = z.enum([
  'MERGE',
  'NEEDS_CHANGES',
  'REJECT',
])

export const createTestReportSchema = z.object({
  executionId: z.string().min(1, 'Execution ID is required'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(5000, 'Description too long').optional(),
  recommendation: recommendationTypeSchema,
  recommendationReason: z.string().max(2000, 'Recommendation reason too long').optional(),
  summary: z.string().optional(),
  overallAnalysis: z.string().optional(),
  score: z.number().min(0).max(100).optional(),
  maxScore: z.number().min(0).optional(),
  acceptanceSuggestion: z.string().optional(),
  testDuration: z.number().int().positive().optional(),
  testRunner: z.string().max(100, 'Test runner name too long').optional(),
})

export const testReportQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  recommendation: recommendationTypeSchema.optional(),
  authorId: z.string().optional(),
  executionId: z.string().optional(),
  search: z.string().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
})

export type RecommendationType = z.infer<typeof recommendationTypeSchema>
export type CreateTestReportInput = z.infer<typeof createTestReportSchema>
export type TestReportQueryInput = z.infer<typeof testReportQuerySchema>