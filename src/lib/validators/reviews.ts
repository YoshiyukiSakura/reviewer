import { z } from 'zod'

export const reviewStatusSchema = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'APPROVED',
  'REJECTED',
  'CHANGES_REQUESTED',
  'CLOSED',
])

export const reviewSourceTypeSchema = z.enum([
  'pull_request',
  'commit',
  'file',
])

export const createReviewSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(5000, 'Description too long').optional(),
  sourceType: reviewSourceTypeSchema.optional(),
  sourceId: z.string().max(100, 'Source ID too long').optional(),
  sourceUrl: z.string().url('Invalid source URL').max(500, 'Source URL too long').optional(),
  authorName: z.string().max(100, 'Author name too long').optional(),
})

export const updateReviewSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  description: z.string().max(5000, 'Description too long').optional(),
  status: reviewStatusSchema.optional(),
})

export const reviewQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: reviewStatusSchema.optional(),
  authorId: z.string().optional(),
  search: z.string().optional(),
})

export type CreateReviewInput = z.infer<typeof createReviewSchema>
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>
export type ReviewQueryInput = z.infer<typeof reviewQuerySchema>