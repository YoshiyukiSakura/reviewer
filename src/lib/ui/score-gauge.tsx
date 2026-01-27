'use client'

import { type HTMLAttributes } from 'react'

export interface ScoreGaugeProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Score value (1-100)
   */
  score: number
  /**
   * Size of the gauge
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Whether to show the score text
   * @default true
   */
  showScore?: boolean
  /**
   * Whether to animate the gauge on mount
   * @default true
   */
  animate?: boolean
  /**
   * Accessible label for the score
   * @default 'Score'
   */
  ariaLabel?: string
}

/**
 * Circular progress gauge component for displaying scores
 *
 * @example
 * ```tsx
 * // Default gauge
 * <ScoreGauge score={85} />
 *
 * // Small size
 * <ScoreGauge score={45} size="sm" />
 *
 * // Large size without animation
 * <ScoreGauge score={92} size="lg" animate={false} />
 * ```
 */
export function ScoreGauge({
  className = '',
  score,
  size = 'md',
  showScore = true,
  animate = true,
  ariaLabel = 'Score',
  ...props
}: ScoreGaugeProps) {
  // Clamp score between 0 and 100
  const clampedScore = Math.max(0, Math.min(100, score))

  // Determine color based on score
  const getScoreColor = (value: number) => {
    if (value >= 70) {
      return 'text-emerald-500 dark:text-emerald-400'
    }
    if (value >= 40) {
      return 'text-amber-500 dark:text-amber-400'
    }
    return 'text-red-500 dark:text-red-400'
  }

  const getTrackColor = () => {
    return 'text-gray-200 dark:text-gray-700'
  }

  const sizes = {
    sm: { container: 'w-16 h-16', text: 'text-sm', strokeWidth: 8 },
    md: { container: 'w-24 h-24', text: 'text-xl', strokeWidth: 10 },
    lg: { container: 'w-32 h-32', text: 'text-2xl', strokeWidth: 12 },
  }

  const { container, text, strokeWidth } = sizes[size]
  const circumference = 2 * Math.PI * 40 // radius = 40
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference

  return (
    <div
      className={`inline-flex items-center justify-center ${container} ${className}`}
      role="img"
      aria-label={`${ariaLabel}: ${clampedScore} out of 100`}
      {...props}
    >
      <svg
        className="w-full h-full transform -rotate-90"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        {/* Background circle (track) */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          className={getTrackColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          className={getScoreColor(clampedScore)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animate ? strokeDashoffset : 0}
          style={{
            transition: animate ? 'stroke-dashoffset 1s ease-out' : 'none',
          }}
        />
      </svg>
      {showScore && (
        <span
          className={`absolute font-bold ${text} ${getScoreColor(clampedScore)}`}
        >
          {clampedScore}
        </span>
      )}
    </div>
  )
}

export default ScoreGauge