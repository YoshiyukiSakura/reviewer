'use client'

import { type HTMLAttributes, useState } from 'react'
import { type ReviewComment, CommentSeverity } from '@/types'
import { Badge } from './badge'

export interface CommentListProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onClick'> {
  /**
   * List of comments to display
   */
  comments: ReviewComment[]
  /**
   * Whether nesting is enabled for replies
   * @default true
   */
  nested?: boolean
  /**
   * Maximum nesting depth
   * @default 3
   */
  maxDepth?: number
  /**
   * Whether to show the file path
   * @default true
   */
  showFilePath?: boolean
  /**
   * Whether to show line numbers
   * @default true
   */
  showLineNumbers?: boolean
  /**
   * Callback when a comment is resolved
   */
  onResolve?: (commentId: string, resolved: boolean) => void
  /**
   * Callback when a comment is clicked
   */
  onClick?: (comment: ReviewComment) => void
  /**
   * Whether to show resolve button
   * @default false
   */
  showResolveButton?: boolean
  /**
   * Custom empty state content
   */
  emptyState?: React.ReactNode
}

/**
 * Get severity badge variant
 */
function getSeverityVariant(severity?: CommentSeverity): 'default' | 'secondary' | 'warning' | 'destructive' | 'success' {
  const variants: Record<CommentSeverity, 'default' | 'secondary' | 'warning' | 'destructive' | 'success'> = {
    INFO: 'default',
    SUGGESTION: 'secondary',
    WARNING: 'warning',
    CRITICAL: 'destructive',
  }
  return severity ? variants[severity] : 'default'
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
 * Single comment item component
 */
interface CommentItemProps {
  comment: ReviewComment
  depth?: number
  maxDepth?: number
  showFilePath?: boolean
  showLineNumbers?: boolean
  onResolve?: (commentId: string, resolved: boolean) => void
  onClick?: (comment: ReviewComment) => void
  showResolveButton?: boolean
}

function CommentItem({
  comment,
  depth = 0,
  maxDepth = 3,
  showFilePath = true,
  showLineNumbers = true,
  onResolve,
  onClick,
  showResolveButton = false,
}: CommentItemProps) {
  const hasReplies = comment.replies && comment.replies.length > 0
  const canNest = depth < maxDepth

  const indentClass = depth > 0 ? `ml-${Math.min(depth * 4, 12)}` : ''
  const borderClass = depth > 0 ? 'border-l-2 border-muted pl-4' : ''

  return (
    <div className={`${depth > 0 ? 'mt-4' : ''}`}>
      <div
        className={`
          rounded-lg p-4
          ${comment.isResolved ? 'bg-muted/30' : 'bg-card'}
          border
          ${borderClass}
          ${onClick ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}
        `}
        onClick={() => onClick?.(comment)}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">
              {comment.authorName || 'Anonymous'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(comment.createdAt)}
            </span>
            {comment.severity && (
              <Badge variant={getSeverityVariant(comment.severity)} size="sm">
                {comment.severity}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {showResolveButton && onResolve && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onResolve(comment.id, !comment.isResolved)
                }}
                className={`
                  text-xs px-2 py-1 rounded transition-colors
                  ${comment.isResolved
                    ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-100'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }
                `}
              >
                {comment.isResolved ? 'Resolved' : 'Resolve'}
              </button>
            )}
          </div>
        </div>

        {/* File location */}
        {showFilePath && comment.filePath && (
          <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded w-fit">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-3 h-3"
            >
              <path
                fillRule="evenodd"
                d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0v2.43l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389 5.5 5.5 0 019.201-2.466l.312.311h-2.433a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.22z"
                clipRule="evenodd"
              />
            </svg>
            <span>{comment.filePath}</span>
            {showLineNumbers && (comment.lineStart !== undefined || comment.lineEnd !== undefined) && (
              <span>
                :{comment.lineStart}
                {comment.lineEnd && comment.lineEnd !== comment.lineStart && `-${comment.lineEnd}`}
              </span>
            )}
          </div>
        )}

        {/* Comment content */}
        <div className="text-sm whitespace-pre-wrap break-words">
          {comment.content}
        </div>

        {/* Replies */}
        {hasReplies && canNest && (
          <div className="mt-4">
            {comment.replies!.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                depth={depth + 1}
                maxDepth={maxDepth}
                showFilePath={showFilePath}
                showLineNumbers={showLineNumbers}
                onResolve={onResolve}
                onClick={onClick}
                showResolveButton={showResolveButton}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Comment list component for displaying comments with optional nesting
 *
 * @example
 * ```tsx
 * // Basic usage
 * <CommentList comments={comments} />
 *
 * // With resolve functionality
 * <CommentList
 *   comments={comments}
 *   showResolveButton
 *   onResolve={(id, resolved) => updateComment(id, { isResolved: resolved })}
 * />
 *
 * // Without nesting
 * <CommentList comments={comments} nested={false} />
 *
 * // With click handler
 * <CommentList
 *   comments={comments}
 *   onClick={(comment) => navigate(`/comments/${comment.id}`)}
 * />
 * ```
 */
export function CommentList({
  className = '',
  comments,
  nested = true,
  maxDepth = 3,
  showFilePath = true,
  showLineNumbers = true,
  onResolve,
  onClick,
  showResolveButton = false,
  emptyState,
  ...props
}: CommentListProps) {
  const sortedComments = [...comments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  if (comments.length === 0) {
    return (
      <div className={`text-center py-8 text-muted-foreground ${className}`} {...props}>
        {emptyState || 'No comments yet'}
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`} {...props}>
      {sortedComments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          depth={0}
          maxDepth={nested ? maxDepth : 0}
          showFilePath={showFilePath}
          showLineNumbers={showLineNumbers}
          onResolve={onResolve}
          onClick={onClick}
          showResolveButton={showResolveButton}
        />
      ))}
    </div>
  )
}

export default CommentList