'use client'

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /**
   * Label for the input
   */
  label?: string
  /**
   * Error message to display
   */
  error?: string
  /**
   * Helper text below the input
   */
  helperText?: string
  /**
   * Left addon content
   */
  leftAddon?: ReactNode
  /**
   * Right addon content
   */
  rightAddon?: ReactNode
  /**
   * Whether the input takes up full width
   * @default true
   */
  fullWidth?: boolean
}

/**
 * Text input component with label, error handling, and addon support
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Input placeholder="Enter your name" />
 *
 * // With label
 * <Input label="Email" type="email" placeholder="john@example.com" />
 *
 * // With error
 * <Input label="Password" type="password" error="Password is required" />
 *
 * // With helper text
 * <Input label="Username" helperText="Must be 3-20 characters" />
 *
 * // With addons
 * <Input leftAddon="@" placeholder="username" />
 * <Input rightAddon=".com" placeholder="domain" />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = '',
      label,
      error,
      helperText,
      leftAddon,
      rightAddon,
      fullWidth = true,
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substring(7)}`

    const wrapperStyles = fullWidth ? 'w-full' : ''

    const inputBaseStyles =
      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

    const addonStyles = 'flex items-center justify-center px-3 text-muted-foreground'

    return (
      <div className={wrapperStyles}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-2 block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftAddon && <div className={`${addonStyles} rounded-l-md border border-input`}>{leftAddon}</div>}
          <input
            ref={ref}
            id={inputId}
            className={`
              ${inputBaseStyles}
              ${leftAddon ? 'rounded-l-none border-l-0' : ''}
              ${rightAddon ? 'rounded-r-none border-r-0' : ''}
              ${error ? 'border-destructive focus-visible:ring-destructive' : ''}
              ${className}
            `}
            {...props}
          />
          {rightAddon && <div className={`${addonStyles} rounded-r-md border border-input`}>{rightAddon}</div>}
        </div>
        {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
        {helperText && !error && <p className="mt-1 text-sm text-muted-foreground">{helperText}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'

export default Input