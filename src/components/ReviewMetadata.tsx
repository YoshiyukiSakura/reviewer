import type { Review } from '@/types'

interface ReviewMetadataProps {
  review: Review
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  CHANGES_REQUESTED:
    'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  CLOSED: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300',
}

export function ReviewMetadata({ review }: ReviewMetadataProps) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
      {/* Title and Status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            {review.title}
          </h1>
          {review.description && (
            <p className="text-zinc-600 dark:text-zinc-400">
              {review.description}
            </p>
          )}
        </div>
        <span
          className={`ml-4 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
            statusColors[review.status]
          }`}
        >
          {review.status.replace('_', ' ')}
        </span>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
        {/* Author */}
        <div>
          <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            Author
          </dt>
          <dd className="text-sm text-zinc-900 dark:text-zinc-100">
            {review.authorName || 'Unknown'}
          </dd>
        </div>

        {/* Created */}
        <div>
          <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            Created
          </dt>
          <dd className="text-sm text-zinc-900 dark:text-zinc-100">
            {new Date(review.createdAt).toLocaleString()}
          </dd>
        </div>

        {/* Updated */}
        <div>
          <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            Last Updated
          </dt>
          <dd className="text-sm text-zinc-900 dark:text-zinc-100">
            {new Date(review.updatedAt).toLocaleString()}
          </dd>
        </div>

        {/* Source Type */}
        {review.sourceType && (
          <div>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Source Type
            </dt>
            <dd className="text-sm text-zinc-900 dark:text-zinc-100">
              {review.sourceType.replace('_', ' ')}
            </dd>
          </div>
        )}

        {/* Source ID */}
        {review.sourceId && (
          <div>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Source ID
            </dt>
            <dd className="text-sm text-zinc-900 dark:text-zinc-100 font-mono">
              {review.sourceId}
            </dd>
          </div>
        )}

        {/* Source URL */}
        {review.sourceUrl && (
          <div>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Source
            </dt>
            <dd className="text-sm">
              <a
                href={review.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                View Source
              </a>
            </dd>
          </div>
        )}
      </div>

      {/* Comment Count */}
      {review.comments && review.comments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {review.comments.length} comment{review.comments.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  )
}
