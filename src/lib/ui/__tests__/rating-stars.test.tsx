/**
 * Unit tests for RatingStars component
 */

import { render, screen, fireEvent, act } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { RatingStars } from '../rating-stars'

describe('RatingStars', () => {
  describe('rendering', () => {
    it('should render 5 stars by default', () => {
      render(<RatingStars rating={3} />)
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(5)
    })

    it('should render correct number of stars based on maxStars', () => {
      render(<RatingStars rating={3} maxStars={10} />)
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(10)
    })

    it('should display correct rating', () => {
      render(<RatingStars rating={4} />)
      const buttons = screen.getAllByRole('button')
      // First 4 stars should be filled (yellow)
      for (let i = 0; i < 4; i++) {
        expect(buttons[i]).toHaveClass('fill-amber-400')
      }
      // Last star should be empty
      expect(buttons[4]).not.toHaveClass('fill-amber-400')
    })
  })

  describe('sizes', () => {
    it('should apply small size classes', () => {
      render(<RatingStars rating={3} size="sm" />)
      const buttons = screen.getAllByRole('button')
      expect(buttons[0]).toHaveClass('w-4')
      expect(buttons[0]).toHaveClass('h-4')
    })

    it('should apply medium size classes (default)', () => {
      render(<RatingStars rating={3} size="md" />)
      const buttons = screen.getAllByRole('button')
      expect(buttons[0]).toHaveClass('w-5')
      expect(buttons[0]).toHaveClass('h-5')
    })

    it('should apply large size classes', () => {
      render(<RatingStars rating={3} size="lg" />)
      const buttons = screen.getAllByRole('button')
      expect(buttons[0]).toHaveClass('w-6')
      expect(buttons[0]).toHaveClass('h-6')
    })
  })

  describe('showValue', () => {
    it('should display rating value when showValue is true', () => {
      render(<RatingStars rating={4.5} showValue />)
      expect(screen.getByText('4.5')).toBeInTheDocument()
    })

    it('should not display rating value when showValue is false', () => {
      render(<RatingStars rating={4} showValue={false} />)
      expect(screen.queryByText('4')).not.toBeInTheDocument()
    })
  })

  describe('interactive mode', () => {
    it('should be clickable in interactive mode', () => {
      const handleRatingChange = vi.fn()
      render(
        <RatingStars
          rating={0}
          interactive
          onRatingChange={handleRatingChange}
        />
      )
      const buttons = screen.getAllByRole('button')
      fireEvent.click(buttons[2])
      expect(handleRatingChange).toHaveBeenCalledWith(3)
    })

    it('should not be clickable in non-interactive mode', () => {
      render(<RatingStars rating={3} interactive={false} />)
      const buttons = screen.getAllByRole('button')
      expect(buttons[0]).toBeDisabled()
    })

    it('should handle keyboard navigation', () => {
      const handleRatingChange = vi.fn()
      render(
        <RatingStars
          rating={0}
          interactive
          onRatingChange={handleRatingChange}
        />
      )
      const buttons = screen.getAllByRole('button')
      fireEvent.keyDown(buttons[0], { key: 'Enter' })
      expect(handleRatingChange).toHaveBeenCalledWith(1)
    })

    it('should handle space key for rating', () => {
      const handleRatingChange = vi.fn()
      render(
        <RatingStars
          rating={0}
          interactive
          onRatingChange={handleRatingChange}
        />
      )
      const buttons = screen.getAllByRole('button')
      fireEvent.keyDown(buttons[0], { key: ' ' })
      expect(handleRatingChange).toHaveBeenCalledWith(1)
    })

    it('should handle arrow right key', () => {
      const handleRatingChange = vi.fn()
      render(
        <RatingStars
          rating={0}
          interactive
          onRatingChange={handleRatingChange}
        />
      )
      const buttons = screen.getAllByRole('button')
      fireEvent.keyDown(buttons[0], { key: 'ArrowRight' })
      expect(handleRatingChange).toHaveBeenCalledWith(2)
    })

    it('should handle arrow left key', () => {
      const handleRatingChange = vi.fn()
      render(
        <RatingStars
          rating={3}
          interactive
          onRatingChange={handleRatingChange}
        />
      )
      const buttons = screen.getAllByRole('button')
      fireEvent.keyDown(buttons[2], { key: 'ArrowLeft' })
      expect(handleRatingChange).toHaveBeenCalledWith(2)
    })
  })

  describe('half star', () => {
    it('should display half star for ratings with 0.5', () => {
      render(<RatingStars rating={3.5} />)
      const buttons = screen.getAllByRole('button')
      // Check that we have a half-filled star (third button should have gradient)
      expect(buttons[2]).toHaveAttribute('aria-label', expect.stringContaining('Half'))
    })

    it('should not display half star for integer ratings', () => {
      render(<RatingStars rating={4} />)
      const buttons = screen.getAllByRole('button')
      // All buttons should be either filled or empty
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute('aria-label', expect.stringContaining('Half'))
      })
    })
  })

  describe('accessibility', () => {
    it('should have correct aria-label', () => {
      render(<RatingStars rating={4} />)
      const container = screen.getByRole('img')
      expect(container).toHaveAttribute('aria-label', 'Rating: 4 out of 5 stars')
    })

    it('should have radiogroup role in interactive mode', () => {
      render(<RatingStars rating={3} interactive />)
      const container = screen.getByRole('radiogroup')
      expect(container).toBeInTheDocument()
    })

    it('should have custom aria-label', () => {
      render(<RatingStars rating={4} ariaLabel="Product rating" />)
      const container = screen.getByRole('img')
      expect(container).toHaveAttribute('aria-label', 'Product rating: 4 out of 5 stars')
    })
  })

  describe('hover state', () => {
    it('should show hover state in interactive mode', async () => {
      render(<RatingStars rating={0} interactive />)
      const buttons = screen.getAllByRole('button')

      await act(async () => {
        fireEvent.mouseEnter(buttons[2])
      })

      // Should have hover scale effect
      expect(buttons[2]).toHaveClass('hover:scale-110')
    })
  })
})