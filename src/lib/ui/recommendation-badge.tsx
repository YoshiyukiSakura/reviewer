'use client'

import { type HTMLAttributes } from 'react'

export type RecommendationType = 'MERGE' | 'NEEDS_CHANGES' | 'REJECT'

export interface RecommendationBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Recommendation type
   */
  type: RecommendationType
  /**
   * Badge size
   * @default 'default'
   */
  size?: 'sm' | 'default' | 'lg'
  /**
   * Show icon
   * @default true
   */
  showIcon?: boolean
}

/**
 * Get icon for recommendation type
 */
function getIcon(type: RecommendationType, className: string) {
  switch (type) {
    case 'MERGE':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={className}
        >
          <path
            fillRule="evenodd"
            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
            clipRule="evenodd"
          />
        </svg>
      )
    case 'NEEDS_CHANGES':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={className}
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      )
    case 'REJECT':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={className}
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
            clipRule="evenodd"
          />
        </svg>
      )
  }
}

/**
 * Get label text for recommendation type
 */
function getLabel(type: RecommendationType): string {
  switch (type) {
    case 'MERGE':
      return 'Merge'
    case 'NEEDS_CHANGES':
      return 'Needs Changes'
    case 'REJECT':
      return 'Reject'
  }
}

/**
 * Get colors for recommendation type
 */
function getColors(type: RecommendationType) {
  const colors = {
    MERGE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    NEEDS_CHANGES: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
    REJECT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  }
  return colors[type]
}

/**
 * Recommendation badge component for displaying code review recommendations
 *
 * @example
 * ```tsx
 * // Basic usage
 * <RecommendationBadge type="MERGE" />
 *
 * // Different types
 * <RecommendationBadge type="MERGE">Merge</RecommendationBadge>
 * <RecommendationBadge type="NEEDS_CHANGES">Needs Changes</RecommendationBadge>
 * <RecommendationBadge type="REJECT">Reject</RecommendationBadge>
 *
 * // Sizes
 * <RecommendationBadge type="MERGE" size="sm">Small</RecommendationBadge>
 * <RecommendationBadge type="MERGE" size="default">Default</RecommendationBadge>
 * <RecommendationBadge type="MERGE" size="lg">Large</RecommendationBadge>
 *
 * // Without icon
 * <RecommendationBadge type="MERGE" showIcon={false} />
 * ```
 */
export function RecommendationBadge({
  className = '',
  type,
  size = 'default',
  showIcon = true,
  children,
  ...props
}: RecommendationBadgeProps) {
  const colors = getColors(type)

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    default: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    default: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }

  const gapSizes = {
    sm: 'gap-1',
    default: 'gap-1.5',
    lg: 'gap-2',
  }

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium transition-colors
        ${colors}
        ${sizes[size]}
        ${gapSizes[size]}
        ${className}
      `}
      {...props}
    >
      {showIcon && getIcon(type, iconSizes[size])}
      {children ?? getLabel(type)}
    </span>
  )
}

export default RecommendationBadge