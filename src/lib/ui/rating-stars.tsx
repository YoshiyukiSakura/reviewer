'use client'

import { type HTMLAttributes, useState } from 'react'

export interface RatingStarsProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Current rating value (0-5)
   */
  rating: number
  /**
   * Maximum stars to display
   * @default 5
   */
  maxStars?: number
  /**
   * Whether the stars are interactive for user rating
   * @default false
   */
  interactive?: boolean
  /**
   * Size of the stars
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Whether to show the numerical rating value
   * @default false
   */
  showValue?: boolean
  /**
   * Callback when rating changes (only for interactive mode)
   */
  onRatingChange?: (rating: number) => void
  /**
   * Accessible label for the rating
   * @default 'Rating'
   */
  ariaLabel?: string
}

/**
 * Star rating component for displaying and collecting ratings
 *
 * @example
 * ```tsx
 * // Display-only rating
 * <RatingStars rating={4} />
 *
 * // Interactive rating with callback
 * <RatingStars
 *   rating={0}
 *   interactive
 *   onRatingChange={(r) => console.log(r)}
 * />
 *
 * // Different sizes
 * <RatingStars rating={3.5} size="sm" />
 * <RatingStars rating={4} size="lg" />
 *
 * // With value display
 * <RatingStars rating={4} showValue />
 * ```
 */
export function RatingStars({
  className = '',
  rating,
  maxStars = 5,
  interactive = false,
  size = 'md',
  showValue = false,
  onRatingChange,
  ariaLabel = 'Rating',
  ...props
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState(0)

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const gapClasses = {
    sm: 'gap-0.5',
    md: 'gap-1',
    lg: 'gap-1.5',
  }

  const textClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  const displayRating = hoverRating || rating
  const fullStars = Math.floor(displayRating)
  const hasHalfStar = displayRating % 1 >= 0.5
  const emptyStars = maxStars - fullStars - (hasHalfStar ? 1 : 0)

  const handleClick = (star: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(star)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, star: number) => {
    if (interactive) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleClick(star)
      } else if (e.key === 'ArrowRight' && star < maxStars) {
        e.preventDefault()
        handleClick(star + 1)
      } else if (e.key === 'ArrowLeft' && star > 1) {
        e.preventDefault()
        handleClick(star - 1)
      }
    }
  }

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={`${ariaLabel}: ${rating} out of ${maxStars} stars`}
      {...props}
    >
      <div
        className={`inline-flex ${gapClasses[size]}`}
        onMouseLeave={() => interactive && setHoverRating(0)}
      >
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            filled
            size={size}
            interactive={interactive}
            onClick={() => handleClick(i + 1)}
            onKeyDown={(e) => handleKeyDown(e, i + 1)}
            onMouseEnter={() => interactive && setHoverRating(i + 1)}
          />
        ))}

        {/* Half star */}
        {hasHalfStar && (
          <Star
            filled="half"
            size={size}
            interactive={interactive}
            onClick={() => handleClick(fullStars + 1)}
            onKeyDown={(e) => handleKeyDown(e, fullStars + 1)}
            onMouseEnter={() => interactive && setHoverRating(fullStars + 1)}
          />
        )}

        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star
            key={`empty-${i}`}
            filled={false}
            size={size}
            interactive={interactive}
            onClick={() => handleClick(fullStars + (hasHalfStar ? 2 : 1) + i)}
            onKeyDown={(e) => handleKeyDown(e, fullStars + (hasHalfStar ? 2 : 1) + i)}
            onMouseEnter={() => interactive && setHoverRating(fullStars + (hasHalfStar ? 2 : 1) + i)}
          />
        ))}
      </div>

      {showValue && (
        <span className={`text-muted-foreground font-medium ${textClasses[size]}`}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  )
}

interface StarProps {
  filled: boolean | 'half'
  size: 'sm' | 'md' | 'lg'
  interactive: boolean
  onClick: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onMouseEnter: () => void
}

function Star({ filled, size, interactive, onClick, onKeyDown, onMouseEnter }: StarProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  return (
    <button
      type="button"
      className={`
        ${sizeClasses[size]}
        ${interactive ? 'cursor-pointer' : 'cursor-default'}
        transition-transform
        ${interactive ? 'hover:scale-110' : ''}
        focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded
      `}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onMouseEnter={onMouseEnter}
      tabIndex={interactive ? 0 : -1}
      aria-label={`${filled === 'half' ? 'Half' : filled ? 'Filled' : 'Empty'} star`}
      disabled={!interactive}
    >
      {filled === 'half' ? (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <defs>
            <linearGradient id="half-star">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="currentColor" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <path
            fill="url(#half-star)"
            stroke="currentColor"
            strokeWidth="1"
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          />
        </svg>
      ) : filled ? (
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full text-amber-400 fill-amber-400"
          aria-hidden="true"
        >
          <path
            stroke="currentColor"
            strokeWidth="1"
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full text-gray-300 dark:text-gray-600 fill-transparent"
          aria-hidden="true"
        >
          <path
            stroke="currentColor"
            strokeWidth="1"
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          />
        </svg>
      )}
    </button>
  )
}

export default RatingStars