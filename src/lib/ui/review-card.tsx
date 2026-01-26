'use client'

import { type HTMLAttributes } from 'react'
import { type Review, ReviewStatus } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './card'
import { Badge } from './badge'
import { RatingStars } from './rating-stars'

export interface ReviewCardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Review data to display
   */
  review: Review
  /**
   * Callback when the card is clicked
   */
  onClick?: () => void
  /**
   * Whether the card is clickable
   * @default false
   */
  clickable?: boolean
  /**
   * Whether to show the author
   * @default true
   */
  showAuthor?: boolean
  /**
   * Whether to show the description
   * @default true
   */
  showDescription?: boolean
  /**
   * Whether to show the source type
   * @default true
   */
  showSource?: boolean
  /**
   * Custom renderer for the footer actions
   */
  footerActions?: React.ReactNode
}

/**
 * Get badge variant for review status
 */
function getStatusBadgeVariant(status: ReviewStatus): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' {
  const variants: Record<ReviewStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
    PENDING: 'warning',
    IN_PROGRESS: 'default',
    APPROVED: 'success',
    CHANGES_REQUESTED: 'secondary',
    CLOSED: 'destructive',
  }
  return variants[status]
}

/**
 * Format date to relative time
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
 * Review card component for displaying review information
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ReviewCard review={reviewData} />
 *
 * // Clickable card
 * <ReviewCard review={reviewData} clickable onClick={() => navigate(`/reviews/${review.id}`)} />
 *
 * // With custom actions
 * <ReviewCard
 *   review={reviewData}
 *   footerActions={
 *     <Button size="sm">View Details</Button>
 *   }
 * />
 *
 * // Without optional sections
 * <ReviewCard
 *   review={reviewData}
 *   showAuthor={false}
 *   showDescription={false}
 *   showSource={false}
 * />
 * ```
 */
export function ReviewCard({
  className = '',
  review,
  onClick,
  clickable = false,
  showAuthor = true,
  showDescription = true,
  showSource = true,
  footerActions,
  ...props
}: ReviewCardProps) {
  const statusVariant = getStatusBadgeVariant(review.status)

  return (
    <Card
      className={`
        ${clickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
        ${className}
      `}
      hoverable={clickable}
      onClick={onClick}
      {...props}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="truncate">{review.title}</CardTitle>
            {showDescription && review.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {review.description}
              </CardDescription>
            )}
          </div>
          <Badge variant={statusVariant}>
            {review.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {showAuthor && review.authorName && (
            <div className="flex items-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
              </svg>
              <span>{review.authorName}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
                clipRule="evenodd"
              />
            </svg>
            <span>{formatRelativeTime(review.createdAt)}</span>
          </div>

          {showSource && review.sourceType && (
            <div className="flex items-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path
                  fillRule="evenodd"
                  d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="capitalize">{review.sourceType.replace('_', ' ')}</span>
            </div>
          )}

          {review.comments && review.comments.length > 0 && (
            <div className="flex items-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path
                  fillRule="evenodd"
                  d="M3.43 2.524A41.29 41.29 0 0110 2c2.236 0 4.43.18 6.57.524 1.437.231 2.43 1.49 2.43 2.902v5.148c0 1.413-.993 2.67-2.43 2.902a41.102 41.102 0 01-3.55.414c-.28.02-.521.18-.643.413l-1.712 3.293a.75.75 0 01-1.33 0l-1.713-3.293a.783.783 0 00-.642-.413 41.108 41.108 0 01-3.55-.414C1.993 13.245 1 11.986 1 10.574V5.426c0-1.413.993-2.67 2.43-2.902z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{review.comments.length} comment{review.comments.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </CardContent>

      {footerActions && (
        <CardFooter className="pt-0">
          {footerActions}
        </CardFooter>
      )}
    </Card>
  )
}

export default ReviewCard