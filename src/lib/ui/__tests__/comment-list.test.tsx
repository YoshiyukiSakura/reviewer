/**
 * Unit tests for CommentList component
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { CommentList } from '../comment-list'
import type { ReviewComment } from '@/types'

describe('CommentList', () => {
  const mockComment: ReviewComment = {
    id: 'comment-1',
    content: 'This is a great improvement!',
    filePath: 'src/components/Button.tsx',
    lineStart: 10,
    lineEnd: 15,
    isResolved: false,
    severity: 'INFO',
    authorId: 'user-123',
    authorName: 'Alice',
    reviewId: 'rev-123',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    replies: [
      {
        id: 'reply-1',
        content: 'Thanks for the feedback!',
        isResolved: false,
        authorId: 'user-456',
        authorName: 'Bob',
        reviewId: 'rev-123',
        parentId: 'comment-1',
        createdAt: new Date('2024-01-15T11:00:00Z'),
        updatedAt: new Date('2024-01-15T11:00:00Z'),
      },
    ],
  }

  const mockComments: ReviewComment[] = [
    {
      id: 'comment-1',
      content: 'First comment',
      isResolved: false,
      authorId: 'user-1',
      reviewId: 'rev-123',
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date('2024-01-15T10:00:00Z'),
    },
    {
      id: 'comment-2',
      content: 'Second comment',
      isResolved: true,
      authorId: 'user-2',
      reviewId: 'rev-123',
      createdAt: new Date('2024-01-15T11:00:00Z'),
      updatedAt: new Date('2024-01-15T11:00:00Z'),
    },
  ]

  describe('rendering', () => {
    it('should render comments', () => {
      render(<CommentList comments={mockComments} />)
      expect(screen.getByText('First comment')).toBeInTheDocument()
      expect(screen.getByText('Second comment')).toBeInTheDocument()
    })

    it('should display empty state when no comments', () => {
      render(<CommentList comments={[]} />)
      expect(screen.getByText('No comments yet')).toBeInTheDocument()
    })

    it('should display custom empty state', () => {
      render(<CommentList comments={[]} emptyState={<div>No comments available</div>} />)
      expect(screen.getByText('No comments available')).toBeInTheDocument()
    })
  })

  describe('severity badges', () => {
    it('should show INFO severity badge', () => {
      render(<CommentList comments={[mockComment]} />)
      expect(screen.getByText('INFO')).toBeInTheDocument()
    })

    it('should show SUGGESTION severity badge', () => {
      const suggestionComment = { ...mockComment, severity: 'SUGGESTION' as const }
      render(<CommentList comments={[suggestionComment]} />)
      expect(screen.getByText('SUGGESTION')).toBeInTheDocument()
    })

    it('should show WARNING severity badge', () => {
      const warningComment = { ...mockComment, severity: 'WARNING' as const }
      render(<CommentList comments={[warningComment]} />)
      expect(screen.getByText('WARNING')).toBeInTheDocument()
    })

    it('should show CRITICAL severity badge', () => {
      const criticalComment = { ...mockComment, severity: 'CRITICAL' as const }
      render(<CommentList comments={[criticalComment]} />)
      expect(screen.getByText('CRITICAL')).toBeInTheDocument()
    })
  })

  describe('file path display', () => {
    it('should show file path by default', () => {
      render(<CommentList comments={[mockComment]} />)
      expect(screen.getByText('src/components/Button.tsx')).toBeInTheDocument()
    })

    it('should hide file path when showFilePath is false', () => {
      render(<CommentList comments={[mockComment]} showFilePath={false} />)
      expect(screen.queryByText('src/components/Button.tsx')).not.toBeInTheDocument()
    })

    it('should show line numbers with file path', () => {
      render(<CommentList comments={[mockComment]} />)
      expect(screen.getByText(/src\/components\/Button\.tsx:10-15/)).toBeInTheDocument()
    })
  })

  describe('line numbers', () => {
    it('should show line numbers by default', () => {
      render(<CommentList comments={[mockComment]} />)
      expect(screen.getByText(':10')).toBeInTheDocument()
    })

    it('should hide line numbers when showLineNumbers is false', () => {
      render(<CommentList comments={[mockComment]} showLineNumbers={false} />)
      expect(screen.queryByText(':10')).not.toBeInTheDocument()
    })

    it('should show single line when lineStart equals lineEnd', () => {
      const singleLineComment = { ...mockComment, lineEnd: 10 }
      render(<CommentList comments={[singleLineComment]} />)
      expect(screen.getByText(':10')).toBeInTheDocument()
      expect(screen.queryByText('-10')).not.toBeInTheDocument()
    })
  })

  describe('resolve functionality', () => {
    it('should show resolve button when showResolveButton is true', () => {
      render(<CommentList comments={[mockComment]} showResolveButton onResolve={vi.fn()} />)
      expect(screen.getByText('Resolve')).toBeInTheDocument()
    })

    it('should hide resolve button by default', () => {
      render(<CommentList comments={[mockComment]} />)
      expect(screen.queryByText('Resolve')).not.toBeInTheDocument()
    })

    it('should show Resolved when comment is resolved', () => {
      const resolvedComment = { ...mockComment, isResolved: true }
      render(<CommentList comments={[resolvedComment]} showResolveButton onResolve={vi.fn()} />)
      expect(screen.getByText('Resolved')).toBeInTheDocument()
    })

    it('should call onResolve when resolve button is clicked', () => {
      const handleResolve = vi.fn()
      render(<CommentList comments={[mockComment]} showResolveButton onResolve={handleResolve} />)
      fireEvent.click(screen.getByText('Resolve'))
      expect(handleResolve).toHaveBeenCalledWith('comment-1', true)
    })

    it('should toggle resolved state', () => {
      const handleResolve = vi.fn()
      const resolvedComment = { ...mockComment, isResolved: true }
      render(<CommentList comments={[resolvedComment]} showResolveButton onResolve={handleResolve} />)
      fireEvent.click(screen.getByText('Resolved'))
      expect(handleResolve).toHaveBeenCalledWith('comment-1', false)
    })
  })

  describe('click handler', () => {
    it('should call onClick when comment is clicked', () => {
      const handleClick = vi.fn()
      render(<CommentList comments={[mockComment]} onClick={handleClick} />)
      const commentCard = screen.getByText('This is a great improvement!').closest('.rounded-lg')!
      fireEvent.click(commentCard)
      expect(handleClick).toHaveBeenCalledWith(mockComment)
    })
  })

  describe('nesting', () => {
    it('should display replies by default', () => {
      render(<CommentList comments={[mockComment]} />)
      expect(screen.getByText('Thanks for the feedback!')).toBeInTheDocument()
    })

    it('should disable nesting when nested is false', () => {
      render(<CommentList comments={[mockComment]} nested={false} />)
      expect(screen.queryByText('Thanks for the feedback!')).not.toBeInTheDocument()
    })

    it('should apply indentation for nested comments', () => {
      render(<CommentList comments={[mockComment]} />)
      const reply = screen.getByText('Thanks for the feedback!').closest('.rounded-lg')
      expect(reply).toHaveClass('border-l-2')
    })
  })

  describe('sorting', () => {
    it('should sort comments by date (oldest first)', () => {
      render(<CommentList comments={mockComments} />)
      const firstComment = screen.getByText('First comment')
      const secondComment = screen.getByText('Second comment')
      expect(firstComment.compareDocumentPosition(secondComment)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    })
  })

  describe('accessibility', () => {
    it('should have proper structure for comments', () => {
      render(<CommentList comments={[mockComment]} />)
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('10:00')).toBeInTheDocument()
    })
  })

  describe('resolved state styling', () => {
    it('should have muted style for resolved comments', () => {
      const resolvedComment = { ...mockComment, isResolved: true }
      render(<CommentList comments={[resolvedComment]} />)
      const commentCard = screen.getByText('This is a great improvement!').closest('.rounded-lg')!
      expect(commentCard).toHaveClass('bg-muted/30')
    })
  })
})