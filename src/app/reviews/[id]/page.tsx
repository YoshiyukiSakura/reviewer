'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import type { Review } from '@/types'
import type { PullRequestDiff } from '@/lib/github/pr-diff'
import { ReviewMetadata } from '@/components/ReviewMetadata'
import { CommentThread } from '@/components/CommentThread'
import { FileDiffViewer } from '@/components/FileDiffViewer'

export default function ReviewDetailsPage() {
  const params = useParams()
  const reviewId = params.id as string

  const [review, setReview] = useState<Review | null>(null)
  const [diff, setDiff] = useState<PullRequestDiff | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [diffError, setDiffError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'comments' | 'files'>('comments')

  useEffect(() => {
    async function fetchReview() {
      try {
        const response = await fetch(`/reviewer/api/reviews/${reviewId}`)
        const result = await response.json()

        if (!result.success) {
          setError(result.error || 'Failed to fetch review')
          return
        }

        setReview(result.data)

        // If this is a PR review, fetch the diff
        if (result.data.sourceType === 'pull_request') {
          try {
            const diffResponse = await fetch(
              `/reviewer/api/reviews/${reviewId}/diff`
            )
            const diffResult = await diffResponse.json()

            if (diffResult.success) {
              setDiff(diffResult.data)
            } else {
              setDiffError(
                diffResult.error || 'Failed to fetch diff (files may not be available)'
              )
            }
          } catch {
            setDiffError('Failed to fetch diff data')
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchReview()
  }, [reviewId])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-100 mx-auto"></div>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            Loading review...
          </p>
        </div>
      </div>
    )
  }

  if (error || !review) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-6xl mb-4">⚠</div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Error Loading Review
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">{error}</p>
          <a
            href="/reviewer"
            className="mt-4 inline-block px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
          >
            Back to Home
          </a>
        </div>
      </div>
    )
  }

  const topLevelComments = review.comments?.filter((c) => !c.parentId) || []
  const hasComments = topLevelComments.length > 0
  const hasDiff = diff && diff.files.length > 0

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header with Back Button */}
        <div className="mb-6">
          <a
            href="/reviewer"
            className="inline-flex items-center text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Reviews
          </a>
        </div>

        {/* Review Metadata */}
        <div className="mb-8">
          <ReviewMetadata review={review} />
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-zinc-200 dark:border-zinc-700">
            <nav className="flex gap-8">
              <button
                onClick={() => setActiveTab('comments')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'comments'
                    ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                Comments {hasComments && `(${topLevelComments.length})`}
              </button>
              {review.sourceType === 'pull_request' && (
                <button
                  onClick={() => setActiveTab('files')}
                  className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'files'
                      ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
                      : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  Files Changed {hasDiff && `(${diff.files.length})`}
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'comments' && (
          <div className="space-y-6">
            {hasComments ? (
              topLevelComments.map((comment) => (
                <CommentThread key={comment.id} comment={comment} />
              ))
            ) : (
              <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-12 text-center">
                <div className="text-zinc-400 dark:text-zinc-500 text-4xl mb-3">
                  💬
                </div>
                <p className="text-zinc-600 dark:text-zinc-400">
                  No comments yet
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="space-y-4">
            {diffError && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                  {diffError}
                </p>
              </div>
            )}
            {hasDiff ? (
              <>
                {/* Diff Summary */}
                <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {diff.files.length} file{diff.files.length !== 1 ? 's' : ''}{' '}
                      changed
                    </span>
                    <span className="text-green-600 dark:text-green-400">
                      +{diff.totalAdditions} additions
                    </span>
                    <span className="text-red-600 dark:text-red-400">
                      -{diff.totalDeletions} deletions
                    </span>
                  </div>
                </div>

                {/* File Diffs */}
                {diff.files.map((file, index) => (
                  <FileDiffViewer
                    key={index}
                    filename={file.filename}
                    status={file.status}
                    additions={file.additions}
                    deletions={file.deletions}
                    patch={file.patch}
                    previousFilename={file.previousFilename}
                  />
                ))}
              </>
            ) : !diffError ? (
              <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-12 text-center">
                <div className="text-zinc-400 dark:text-zinc-500 text-4xl mb-3">
                  📁
                </div>
                <p className="text-zinc-600 dark:text-zinc-400">
                  No file changes available
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
