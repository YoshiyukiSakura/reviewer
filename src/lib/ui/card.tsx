'use client'

import { type HTMLAttributes, type ReactNode } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Card content
   */
  children: ReactNode
  /**
   * Whether the card should have hover effects
   * @default false
   */
  hoverable?: boolean
}

/**
 * Card header props
 */
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

/**
 * Card title props
 */
export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode
}

/**
 * Card description props
 */
export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode
}

/**
 * Card content props
 */
export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

/**
 * Card footer props
 */
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /**
   * Alignment of footer content
   * @default 'end'
   */
  align?: 'start' | 'center' | 'end' | 'between'
}

/**
 * Container for card content
 *
 * @example
 * ```tsx
 * // Basic card
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Card Title</CardTitle>
 *     <CardDescription>Card description text</CardDescription>
 *   </CardHeader>
 *   <CardContent>
 *     <p>Card content goes here</p>
 *   </CardContent>
 *   <CardFooter>
 *     <Button>Action</Button>
 *   </CardFooter>
 * </Card>
 *
 * // Hoverable card
 * <Card hoverable>
 *   <CardContent>Content with hover effect</CardContent>
 * </Card>
 *
 * // Full featured card
 * <Card className="w-80">
 *   <CardHeader>
 *     <CardTitle>Project Alpha</CardTitle>
 *     <CardDescription>Active project</CardDescription>
 *   </CardHeader>
 *   <CardContent>
 *     <p>Project details...</p>
 *   </CardContent>
 *   <CardFooter align="between">
 *     <Button variant="outline">Details</Button>
 *     <Button>Open</Button>
 *   </CardFooter>
 * </Card>
 * ```
 */
export function Card({ className = '', children, hoverable = false, ...props }: CardProps) {
  return (
    <div
      className={`
        rounded-lg border bg-card text-card-foreground shadow-sm
        ${hoverable ? 'transition-shadow hover:shadow-md cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Header section of the card
 */
export function CardHeader({ className = '', children, ...props }: CardHeaderProps) {
  return (
    <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
      {children}
    </div>
  )
}

/**
 * Title of the card
 */
export function CardTitle({ className = '', children, ...props }: CardTitleProps) {
  return (
    <h3 className={`text-xl font-semibold leading-none tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  )
}

/**
 * Description text of the card
 */
export function CardDescription({ className = '', children, ...props }: CardDescriptionProps) {
  return (
    <p className={`text-sm text-muted-foreground ${className}`} {...props}>
      {children}
    </p>
  )
}

/**
 * Main content section of the card
 */
export function CardContent({ className = '', children, ...props }: CardContentProps) {
  return (
    <div className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  )
}

/**
 * Footer section of the card with configurable alignment
 */
export function CardFooter({
  className = '',
  children,
  align = 'end',
  ...props
}: CardFooterProps) {
  const alignClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  }

  return (
    <div className={`flex items-center p-6 pt-0 ${alignClasses[align]} ${className}`} {...props}>
      {children}
    </div>
  )
}

export default Card