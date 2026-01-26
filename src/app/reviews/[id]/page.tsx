'use client'

import { use, useState, useCallback, useMemo } from 'react'
import {
  useReview,
  useReviewComments,
  useCommentActions,
  useAuth,
} from '@/lib/react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/lib/ui'
import { Badge } from '@/lib/ui/badge'
import { Button } from '@/lib/ui/button'
import { Input } from '@/lib/ui/input'
import { CommentList } from '@/lib/ui/comment-list'
import type { Review, ReviewComment, ReviewStatus, CommentSeverity } from '@/types'

/**
 * Status badge configuration
 */
const statusConfig: Record<ReviewStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' }> = {
  PENDING: { label: 'Pending', variant: 'warning' },
  IN_PROGRESS: { label: 'In Progress', variant: 'default' },
  APPROVED: { label: 'Approved', variant: 'success' },
  CHANGES_REQUESTED: { label: 'Changes Requested', variant: 'secondary' },
  CLOSED: { label: 'Closed', variant: 'destructive' },
}

/**
 * Severity options for new comment
 */
const severityOptions: { value: CommentSeverity | ''; label: string }[] = [
  { value: '', label: 'Select severity' },
  { value: 'INFO', label: 'Info' },
  { value: 'SUGGESTION', label: 'Suggestion' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'CRITICAL', label: 'Critical' },
]

/**
 * Format date to readable string
 */
function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format relative time
 */
function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return then.toLocaleDateString()
}

/**
 * Review detail skeleton loading state
 */
function ReviewDetailSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted mb-2" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
      </div>

      <Card>
        <CardHeader>
          <div className="h-6 w-64 animate-pulse rounded bg-muted mb-2" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Error state component
 */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-8 h-8 text-destructive"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Failed to load review</h3>
            <p className="text-muted-foreground mb-4">{message}</p>
            <Button variant="outline" onClick={onRetry}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * New comment form component
 */
interface NewCommentFormProps {
  reviewId: string
  onSuccess: () => void
}

function NewCommentForm({ reviewId, onSuccess }: NewCommentFormProps) {
  const { createComment } = useCommentActions()
  const { user } = useAuth()

  const [content, setContent] = useState('')
  const [filePath, setFilePath] = useState('')
  const [lineStart, setLineStart] = useState('')
  const [severity, setSeverity] = useState<CommentSeverity | ''>('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')

      if (!content.trim()) {
        setError('Comment content is required')
        return
      }

      setIsSubmitting(true)
      try {
        await createComment(reviewId, {
          content: content.trim(),
          filePath: filePath.trim() || undefined,
          lineStart: lineStart ? parseInt(lineStart, 10) : undefined,
          severity: severity || undefined,
          authorName: user?.name || 'Anonymous',
        })
        setContent('')
        setFilePath('')
        setLineStart('')
        setSeverity('')
        onSuccess()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create comment')
      } finally {
        setIsSubmitting(false)
      }
    },
    [reviewId, createComment, content, filePath, lineStart, severity, user, onSuccess]
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          placeholder="File path (optional, e.g., src/utils/helper.ts)"
          value={filePath}
          onChange={(e) => setFilePath(e.target.value)}
          fullWidth
        />
      </div>

      <div className="flex gap-4">
        <div className="w-32">
          <Input
            type="number"
            placeholder="Line"
            value={lineStart}
            onChange={(e) => setLineStart(e.target.value)}
            fullWidth
          />
        </div>
        <div className="flex-1">
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as CommentSeverity | '')}
          >
            {severityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <textarea
          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Write your comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || !content.trim()}>
          {isSubmitting ? 'Adding...' : 'Add Comment'}
        </Button>
      </div>
    </form>
  )
}

/**
 * Review detail page component
 */
export default function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { user } = useAuth()

  const {
    review,
    isLoading: reviewLoading,
    error: reviewError,
    refetch: refetchReview,
  } = useReview(id)

  const {
    comments,
    isLoading: commentsLoading,
    refetch: refetchComments,
  } = useReviewComments(id)

  const { resolveComment, unresolveComment } = useCommentActions()
  const [resolvingCommentId, setResolvingCommentId] = useState<string | null>(null)

  const handleResolveComment = useCallback(
    async (commentId: string, resolved: boolean) => {
      setResolvingCommentId(commentId)
      try {
        if (resolved) {
          await resolveComment(commentId)
        } else {
          await unresolveComment(commentId)
        }
        await refetchComments()
      } catch (err) {
        console.error('Failed to resolve comment:', err)
      } finally {
        setResolvingCommentId(null)
      }
    },
    [resolveComment, unresolveComment, refetchComments]
  )

  const handleCommentCreated = useCallback(() => {
    refetchComments()
    refetchReview()
  }, [refetchComments, refetchReview])

  const handleBack = useCallback(() => {
    window.history.back()
  }, [])

  const commentStats = useMemo(() => {
    const total = comments.length
    const resolved = comments.filter((c) => c.isResolved).length
    const unresolved = total - resolved
    return { total, resolved, unresolved }
  }, [comments])

  const status = review
    ? statusConfig[review.status] || statusConfig.PENDING
    : null

  // Loading state
  if (reviewLoading) {
    return <ReviewDetailSkeleton />
  }

  // Error state
  if (reviewError || !review) {
    return (
      <ErrorState
        message={reviewError?.message || 'Review not found'}
        onRetry={() => refetchReview()}
      />
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Back button and header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4 mr-2"
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
              clipRule="evenodd"
            />
          </svg>
          Back to Reviews
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{review.title}</h1>
            <p className="text-muted-foreground mt-1">
              Review {review.id.slice(0, 8)} • Created {formatDate(review.createdAt)}
            </p>
          </div>
          {status && (
            <Badge variant={status.variant} size="lg">
              {status.label}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - Review details and comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Review details card */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              {review.description ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{review.description}</p>
                </div>
              ) : (
                <p className="text-muted-foreground italic">No description provided</p>
              )}

              {/* Source information */}
              {review.sourceType && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">Source</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline" size="sm">
                      {review.sourceType.replace('_', ' ')}
                    </Badge>
                    {review.sourceId && <span>{review.sourceId}</span>}
                    {review.sourceUrl && (
                      <a
                        href={review.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        View Source
                      </a>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Comments</CardTitle>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{commentStats.total} total</span>
                  <span className="text-green-600">
                    {commentStats.resolved} resolved
                  </span>
                  <span className="text-yellow-600">
                    {commentStats.unresolved} open
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Comments list */}
              {commentsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-20 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : (
                <CommentList
                  comments={comments}
                  showResolveButton
                  onResolve={handleResolveComment}
                  resolvingCommentId={resolvingCommentId}
                />
              )}

              {/* Add comment form */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-medium mb-4">Add a Comment</h4>
                <NewCommentForm
                  reviewId={id}
                  onSuccess={handleCommentCreated}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Meta information */}
        <div className="space-y-6">
          {/* Author card */}
          <Card>
            <CardHeader>
              <CardTitle>Author</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-lg font-medium">
                    {review.authorName?.charAt(0) || 'A'}
                  </span>
                </div>
                <div>
                  <p className="font-medium">
                    {review.authorName || 'Anonymous'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {review.authorId.slice(0, 8)}...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline card */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm font-medium">
                    {formatRelativeTime(review.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">Last updated</span>
                  <span className="text-sm font-medium">
                    {formatRelativeTime(review.updatedAt)}
                  </span>
                </div>
                {review.updatedAt !== review.createdAt && (
                  <p className="text-xs text-muted-foreground pt-2 border-t">
                    Edited {formatDate(review.updatedAt)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick stats card */}
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{commentStats.total}</p>
                  <p className="text-xs text-muted-foreground">Comments</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{commentStats.unresolved}</p>
                  <p className="text-xs text-muted-foreground">Open</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}