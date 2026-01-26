import { z } from 'zod'

export const commentSeveritySchema = z.enum([
  'INFO',
  'SUGGESTION',
  'WARNING',
  'ERROR',
  'CRITICAL',
])

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Content is required').max(10000, 'Content too long'),
  reviewId: z.string().min(1, 'Review ID is required'),
  filePath: z.string().max(500, 'File path too long').optional(),
  lineStart: z.coerce.number().int().positive().optional(),
  lineEnd: z.coerce.number().int().positive().optional(),
  severity: commentSeveritySchema.optional(),
  parentId: z.string().optional(),
  authorName: z.string().max(100, 'Author name too long').optional(),
})

export const updateCommentSchema = z.object({
  content: z.string().min(1, 'Content is required').max(10000, 'Content too long').optional(),
  isResolved: z.boolean().optional(),
  severity: commentSeveritySchema.optional(),
})

export const commentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  reviewId: z.string().optional(),
  isResolved: z.coerce.boolean().optional(),
  severity: commentSeveritySchema.optional(),
  authorId: z.string().optional(),
})

export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>
export type CommentQueryInput = z.infer<typeof commentQuerySchema>