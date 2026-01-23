import type { ReviewComment } from '@/types'

interface CommentThreadProps {
  comment: ReviewComment
  level?: number
}

const severityColors = {
  INFO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  SUGGESTION: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  WARNING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  ERROR: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export function CommentThread({ comment, level = 0 }: CommentThreadProps) {
  const hasReplies = comment.replies && comment.replies.length > 0
  const isNested = level > 0

  return (
    <div
      className={`${
        isNested ? 'ml-8 mt-4 border-l-2 border-zinc-200 dark:border-zinc-700 pl-4' : ''
      }`}
    >
      <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
        {/* Comment Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {comment.authorName || 'Unknown'}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {new Date(comment.createdAt).toLocaleString()}
              </span>
            </div>
            {comment.severity && (
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  severityColors[comment.severity]
                }`}
              >
                {comment.severity}
              </span>
            )}
            {comment.isResolved && (
              <span className="text-xs px-2 py-1 rounded-full font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                Resolved
              </span>
            )}
          </div>
        </div>

        {/* File Location Info */}
        {comment.filePath && (
          <div className="mb-2 text-xs text-zinc-600 dark:text-zinc-400 font-mono">
            {comment.filePath}
            {comment.lineStart && (
              <span>
                :{comment.lineStart}
                {comment.lineEnd && comment.lineEnd !== comment.lineStart && (
                  <>-{comment.lineEnd}</>
                )}
              </span>
            )}
          </div>
        )}

        {/* Comment Content */}
        <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
          {comment.content}
        </div>
      </div>

      {/* Replies */}
      {hasReplies && (
        <div className="mt-4 space-y-4">
          {comment.replies!.map((reply) => (
            <CommentThread key={reply.id} comment={reply} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
