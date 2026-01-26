'use client'

import { type HTMLAttributes, type ReactNode } from 'react'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Badge variant
   * @default 'default'
   */
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
  /**
   * Badge size
   * @default 'default'
   */
  size?: 'sm' | 'default' | 'lg'
  /**
   * Badge content
   */
  children: ReactNode
}

/**
 * Status badge component for showing labels, statuses, or tags
 *
 * @example
 * ```tsx
 * // Default badge
 * <Badge>New</Badge>
 *
 * // Variants
 * <Badge variant="secondary">Secondary</Badge>
 * <Badge variant="destructive">Error</Badge>
 * <Badge variant="outline">Outline</Badge>
 * <Badge variant="success">Active</Badge>
 * <Badge variant="warning">Pending</Badge>
 *
 * // Sizes
 * <Badge size="sm">Small</Badge>
 * <Badge size="default">Default</Badge>
 * <Badge size="lg">Large</Badge>
 *
 * // With custom class
 * <Badge className="bg-purple-100 text-purple-800">Custom</Badge>
 * ```
 */
export function Badge({
  className = '',
  variant = 'default',
  size = 'default',
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/80',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/80',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    default: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base',
  }

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium transition-colors
        focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  )
}

export default Badge