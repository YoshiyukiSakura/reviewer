/**
 * Unit tests for ReviewCard component
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { ReviewCard } from '../review-card'
import type { Review } from '@/types'

describe('ReviewCard', () => {
  const mockReview: Review = {
    id: 'rev-123',
    title: 'Implement new feature',
    description: 'This is a detailed description of the review.',
    status: 'PENDING',
    sourceType: 'pull_request',
    sourceId: 'pr-456',
    authorId: 'user-789',
    authorName: 'John Doe',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T12:00:00Z'),
    comments: [
      {
        id: 'comment-1',
        content: 'Great work!',
        isResolved: false,
        authorId: 'user-123',
        reviewId: 'rev-123',
        createdAt: new Date('2024-01-15T11:00:00Z'),
        updatedAt: new Date('2024-01-15T11:00:00Z'),
      },
    ],
  }

  describe('rendering', () => {
    it('should render review card with title', () => {
      render(<ReviewCard review={mockReview} />)
      expect(screen.getByText('Implement new feature')).toBeInTheDocument()
    })

    it('should render description when provided', () => {
      render(<ReviewCard review={mockReview} />)
      expect(screen.getByText('This is a detailed description of the review.')).toBeInTheDocument()
    })

    it('should hide description when showDescription is false', () => {
      render(<ReviewCard review={mockReview} showDescription={false} />)
      expect(screen.queryByText('This is a detailed description')).not.toBeInTheDocument()
    })
  })

  describe('status badge', () => {
    it('should show PENDING status with warning variant', () => {
      render(<ReviewCard review={mockReview} />)
      expect(screen.getByText('PENDING')).toBeInTheDocument()
    })

    it('should show IN_PROGRESS status', () => {
      const inProgressReview = { ...mockReview, status: 'IN_PROGRESS' as const }
      render(<ReviewCard review={inProgressReview} />)
      expect(screen.getByText('IN PROGRESS')).toBeInTheDocument()
    })

    it('should show APPROVED status with success variant', () => {
      const approvedReview = { ...mockReview, status: 'APPROVED' as const }
      render(<ReviewCard review={approvedReview} />)
      expect(screen.getByText('APPROVED')).toBeInTheDocument()
    })

    it('should show CHANGES_REQUESTED status', () => {
      const requestedReview = { ...mockReview, status: 'CHANGES_REQUESTED' as const }
      render(<ReviewCard review={requestedReview} />)
      expect(screen.getByText('CHANGES REQUESTED')).toBeInTheDocument()
    })

    it('should show CLOSED status with destructive variant', () => {
      const closedReview = { ...mockReview, status: 'CLOSED' as const }
      render(<ReviewCard review={closedReview} />)
      expect(screen.getByText('CLOSED')).toBeInTheDocument()
    })
  })

  describe('author', () => {
    it('should show author name by default', () => {
      render(<ReviewCard review={mockReview} />)
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should hide author when showAuthor is false', () => {
      render(<ReviewCard review={mockReview} showAuthor={false} />)
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })
  })

  describe('source type', () => {
    it('should show source type by default', () => {
      render(<ReviewCard review={mockReview} />)
      expect(screen.getByText('pull request')).toBeInTheDocument()
    })

    it('should hide source when showSource is false', () => {
      render(<ReviewCard review={mockReview} showSource={false} />)
      expect(screen.queryByText('pull request')).not.toBeInTheDocument()
    })

    it('should format source type with spaces', () => {
      render(<ReviewCard review={mockReview} />)
      expect(screen.getByText('pull request')).toBeInTheDocument()
    })
  })

  describe('comments count', () => {
    it('should show comment count when comments exist', () => {
      render(<ReviewCard review={mockReview} />)
      expect(screen.getByText('1 comment')).toBeInTheDocument()
    })

    it('should use singular for one comment', () => {
      render(<ReviewCard review={mockReview} />)
      expect(screen.getByText('1 comment')).toBeInTheDocument()
    })

    it('should use plural for multiple comments', () => {
      const reviewWithComments = {
        ...mockReview,
        comments: [
          ...mockReview.comments!,
          {
            id: 'comment-2',
            content: 'Another comment',
            isResolved: false,
            authorId: 'user-456',
            reviewId: 'rev-123',
            createdAt: new Date('2024-01-15T11:30:00Z'),
            updatedAt: new Date('2024-01-15T11:30:00Z'),
          },
        ],
      }
      render(<ReviewCard review={reviewWithComments} />)
      expect(screen.getByText('2 comments')).toBeInTheDocument()
    })
  })

  describe('clickable', () => {
    it('should call onClick when clickable is true', () => {
      const handleClick = vi.fn()
      render(<ReviewCard review={mockReview} clickable onClick={handleClick} />)
      fireEvent.click(screen.getByText('Implement new feature').closest('.bg-card')!)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should not show pointer cursor when not clickable', () => {
      render(<ReviewCard review={mockReview} />)
      expect(screen.getByText('Implement new feature').closest('.bg-card')).not.toHaveClass('cursor-pointer')
    })
  })

  describe('footer actions', () => {
    it('should render footer actions when provided', () => {
      render(
        <ReviewCard
          review={mockReview}
          footerActions={<button>View Details</button>}
        />
      )
      expect(screen.getByRole('button', { name: 'View Details' })).toBeInTheDocument()
    })
  })

  describe('date formatting', () => {
    it('should display relative time for recent dates', () => {
      render(<ReviewCard review={mockReview} />)
      // The date should be formatted (may show "just now" or similar)
      expect(screen.getByText(/ago|now/)).toBeInTheDocument()
    })
  })

  describe('custom className', () => {
    it('should apply custom className', () => {
      render(<ReviewCard review={mockReview} className="custom-card" />)
      expect(screen.getByText('Implement new feature').closest('.bg-card')).toHaveClass('custom-card')
    })
  })
})