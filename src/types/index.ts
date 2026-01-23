/**
 * Core type definitions for the Reviewer application
 */

// Review status enum
export type ReviewStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'APPROVED'
  | 'CHANGES_REQUESTED'
  | 'CLOSED'

// Comment severity enum
export type CommentSeverity = 'INFO' | 'SUGGESTION' | 'WARNING' | 'CRITICAL'

// Review source type
export type ReviewSourceType = 'pull_request' | 'commit' | 'file'

// Core Review interface
export interface Review {
  id: string
  title: string
  description?: string
  status: ReviewStatus
  sourceType?: ReviewSourceType
  sourceId?: string
  sourceUrl?: string
  authorId: string
  authorName?: string
  createdAt: Date
  updatedAt: Date
  comments?: ReviewComment[]
}

// Core ReviewComment interface
export interface ReviewComment {
  id: string
  content: string
  filePath?: string
  lineStart?: number
  lineEnd?: number
  isResolved: boolean
  severity?: CommentSeverity
  authorId: string
  authorName?: string
  parentId?: string
  parent?: ReviewComment
  replies?: ReviewComment[]
  reviewId: string
  review?: Review
  createdAt: Date
  updatedAt: Date
}

// Request types for creating/updating reviews
export interface CreateReviewRequest {
  title: string
  description?: string
  sourceType?: ReviewSourceType
  sourceId?: string
  sourceUrl?: string
  authorName?: string
}

export interface UpdateReviewRequest {
  title?: string
  description?: string
  status?: ReviewStatus
}

// Request types for creating/updating comments
export interface CreateReviewCommentRequest {
  content: string
  filePath?: string
  lineStart?: number
  lineEnd?: number
  severity?: CommentSeverity
  parentId?: string
  authorName?: string
}

export interface UpdateReviewCommentRequest {
  content?: string
  isResolved?: boolean
  severity?: CommentSeverity
}

// API response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// AI Review Configuration Types
export type ReviewType = 'comprehensive' | 'security' | 'performance' | 'focused'

export type AIProvider = 'openai' | 'anthropic' | 'azure-openai'

export type AIModel =
  // OpenAI models
  | 'gpt-4'
  | 'gpt-4-turbo'
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-3.5-turbo'
  // Anthropic models
  | 'claude-3-opus'
  | 'claude-3-sonnet'
  | 'claude-3-haiku'
  | 'claude-3-5-sonnet'
  | 'claude-3-5-haiku'

// Review Configuration
export interface ReviewConfig {
  reviewType: ReviewType
  aiProvider: AIProvider
  aiModel: AIModel
  focusAreas?: string[]
}

// Extended UpdateReviewRequest with configuration
export interface UpdateReviewConfigRequest extends UpdateReviewRequest {
  config?: ReviewConfig
}

// Re-trigger review request
export interface RetriggerReviewRequest {
  config?: ReviewConfig
}
