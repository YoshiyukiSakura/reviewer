'use client'

import { Component, type ReactNode, type ErrorInfo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './card'
import { Button } from './button'

export interface ErrorBoundaryProps {
  /**
   * Content to wrap with error boundary
   */
  children: ReactNode
  /**
   * Fallback component to display when an error occurs
   */
  fallback?: ReactNode
  /**
   * Callback called when error is caught
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /**
   * Custom className for the fallback container
   */
  className?: string
}

/**
 * Default error fallback component
 */
function DefaultErrorFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <Card className="m-4 border-destructive bg-destructive/5">
      <CardHeader>
        <CardTitle className="text-destructive">Something went wrong</CardTitle>
        <CardDescription>An error occurred while rendering this component.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md bg-muted p-4">
          <p className="text-sm font-medium">Error message:</p>
          <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
        </div>
        <Button onClick={onReset} variant="outline">
          Try again
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * Error boundary component that catches React rendering errors
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // With custom fallback
 * <ErrorBoundary
 *   fallback={<div>Something went wrong</div>}
 *   onError={(error) => console.error(error)}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps> {
  state: {
    hasError: boolean
    error: Error | null
  }

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <DefaultErrorFallback
          error={this.state.error || new Error('Unknown error')}
          onReset={this.handleReset}
        />
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary