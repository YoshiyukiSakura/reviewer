'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import ReviewEditForm from '@/components/ReviewEditForm';
import type { Review, ReviewConfig, ApiResponse, CommentSeverity } from '@/types';

const SEVERITY_COLORS: Record<CommentSeverity, string> = {
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  WARNING: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  SUGGESTION: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  INFO: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
};

export default function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState<string | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const fetchReview = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/reviews/${id}`);
      const result: ApiResponse<Review> = await response.json();

      if (result.success && result.data) {
        setReview(result.data);
      } else {
        setError(result.error || 'Failed to fetch review');
      }
    } catch (err) {
      setError('Failed to fetch review');
      console.error('Error fetching review:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (id) {
      fetchReview();
    }
  }, [id, fetchReview]);

  const handleSave = async (updatedReview: Partial<Review>) => {
    if (!id) return;

    try {
      const response = await fetch(`/api/reviews/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedReview),
      });

      const result: ApiResponse<Review> = await response.json();

      if (result.success && result.data) {
        setReview(result.data);
        setIsEditing(false);
        alert('Review updated successfully');
      } else {
        alert(result.error || 'Failed to update review');
      }
    } catch (err) {
      console.error('Error updating review:', err);
      alert('Failed to update review');
    }
  };

  const handleRetrigger = async (config?: ReviewConfig) => {
    if (!id) return;

    const confirmed = confirm(
      'Are you sure you want to re-trigger this review? This will create new review comments.'
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/reviews/${id}/retrigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config }),
      });

      const result: ApiResponse<{
        review: Review;
        aiResult?: unknown;
        durationMs: number;
      }> = await response.json();

      if (result.success) {
        alert('Review re-triggered successfully. Refreshing...');
        await fetchReview();
      } else {
        alert(result.error || 'Failed to re-trigger review');
      }
    } catch (err) {
      console.error('Error re-triggering review:', err);
      alert('Failed to re-trigger review');
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="text-lg text-zinc-600 dark:text-zinc-400">Loading review...</div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="text-center">
          <div className="text-lg text-red-600 dark:text-red-400 mb-4">
            {error || 'Review not found'}
          </div>
          <Link
            href="/reviews"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Back to reviews
          </Link>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link
              href="/reviews"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Back to reviews
            </Link>
          </div>
          <ReviewEditForm
            review={review}
            onSave={handleSave}
            onRetrigger={handleRetrigger}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-between items-center">
          <Link
            href="/reviews"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to reviews
          </Link>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Edit Review
          </button>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-8 mb-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {review.title}
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                {
                  PENDING:
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
                  IN_PROGRESS:
                    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
                  APPROVED:
                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                  CHANGES_REQUESTED:
                    'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
                  CLOSED:
                    'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
                }[review.status]
              }`}
            >
              {review.status}
            </span>
          </div>

          {review.description && (
            <p className="text-zinc-600 dark:text-zinc-400 mb-6 whitespace-pre-wrap">
              {review.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm border-t border-zinc-200 dark:border-zinc-700 pt-4">
            {review.sourceUrl && (
              <div>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Source:
                </span>{' '}
                <a
                  href={review.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {review.sourceType === 'pull_request' ? 'Pull Request' : 'View Source'}
                </a>
              </div>
            )}

            {review.authorName && (
              <div>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Author:
                </span>{' '}
                <span className="text-zinc-600 dark:text-zinc-400">
                  {review.authorName}
                </span>
              </div>
            )}

            <div>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Created:
              </span>{' '}
              <span className="text-zinc-600 dark:text-zinc-400">
                {formatDate(review.createdAt)}
              </span>
            </div>

            <div>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Updated:
              </span>{' '}
              <span className="text-zinc-600 dark:text-zinc-400">
                {formatDate(review.updatedAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
            Comments ({review.comments?.length || 0})
          </h2>

          {!review.comments || review.comments.length === 0 ? (
            <p className="text-zinc-600 dark:text-zinc-400">No comments yet</p>
          ) : (
            <div className="space-y-4">
              {review.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      {comment.severity && (
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            SEVERITY_COLORS[comment.severity]
                          }`}
                        >
                          {comment.severity}
                        </span>
                      )}
                      {comment.filePath && (
                        <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-700 dark:text-zinc-300">
                          {comment.filePath}
                          {comment.lineStart && `:${comment.lineStart}`}
                          {comment.lineEnd && comment.lineEnd !== comment.lineStart
                            ? `-${comment.lineEnd}`
                            : ''}
                        </code>
                      )}
                    </div>
                    {comment.isResolved && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        Resolved
                      </span>
                    )}
                  </div>

                  <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                    {comment.content}
                  </p>

                  <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                    {comment.authorName && <span>{comment.authorName} • </span>}
                    {formatDate(comment.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
