/**
 * Unit tests for Badge component
 */

import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { Badge } from '../badge'

describe('Badge', () => {
  describe('rendering', () => {
    it('should render badge with children', () => {
      render(<Badge>New</Badge>)
      expect(screen.getByText('New')).toBeInTheDocument()
    })

    it('should apply base styles', () => {
      render(<Badge>Test</Badge>)
      expect(screen.getByText('Test')).toHaveClass('inline-flex')
      expect(screen.getByText('Test')).toHaveClass('items-center')
      expect(screen.getByText('Test')).toHaveClass('rounded-full')
      expect(screen.getByText('Test')).toHaveClass('font-medium')
    })

    it('should apply custom className', () => {
      render(<Badge className="custom-badge">Custom</Badge>)
      expect(screen.getByText('Custom')).toHaveClass('custom-badge')
    })
  })

  describe('variants', () => {
    it('should apply default variant styles', () => {
      render(<Badge variant="default">Default</Badge>)
      expect(screen.getByText('Default')).toHaveClass('bg-primary')
    })

    it('should apply secondary variant styles', () => {
      render(<Badge variant="secondary">Secondary</Badge>)
      expect(screen.getByText('Secondary')).toHaveClass('bg-secondary')
    })

    it('should apply destructive variant styles', () => {
      render(<Badge variant="destructive">Error</Badge>)
      expect(screen.getByText('Error')).toHaveClass('bg-destructive')
    })

    it('should apply outline variant styles', () => {
      render(<Badge variant="outline">Outline</Badge>)
      expect(screen.getByText('Outline')).toHaveClass('border')
    })

    it('should apply success variant styles', () => {
      render(<Badge variant="success">Active</Badge>)
      expect(screen.getByText('Active')).toHaveClass('bg-green-100')
    })

    it('should apply warning variant styles', () => {
      render(<Badge variant="warning">Pending</Badge>)
      expect(screen.getByText('Pending')).toHaveClass('bg-yellow-100')
    })
  })

  describe('sizes', () => {
    it('should apply default size styles', () => {
      render(<Badge size="default">Default</Badge>)
      expect(screen.getByText('Default')).toHaveClass('px-2.5')
      expect(screen.getByText('Default')).toHaveClass('py-0.5')
      expect(screen.getByText('Default')).toHaveClass('text-sm')
    })

    it('should apply small size styles', () => {
      render(<Badge size="sm">Small</Badge>)
      expect(screen.getByText('Small')).toHaveClass('px-2')
      expect(screen.getByText('Small')).toHaveClass('py-0.5')
      expect(screen.getByText('Small')).toHaveClass('text-xs')
    })

    it('should apply large size styles', () => {
      render(<Badge size="lg">Large</Badge>)
      expect(screen.getByText('Large')).toHaveClass('px-3')
      expect(screen.getByText('Large')).toHaveClass('py-1')
      expect(screen.getByText('Large')).toHaveClass('text-base')
    })
  })

  describe('accessibility', () => {
    it('should support aria attributes', () => {
      render(<Badge aria-label="Status badge">Badge</Badge>)
      expect(screen.getByText('Badge')).toHaveAttribute('aria-label', 'Status badge')
    })
  })

  describe('default variant and size', () => {
    it('should use default variant when not specified', () => {
      render(<Badge>Default</Badge>)
      expect(screen.getByText('Default')).toHaveClass('bg-primary')
    })

    it('should use default size when not specified', () => {
      render(<Badge>Size</Badge>)
      expect(screen.getByText('Size')).toHaveClass('px-2.5')
    })
  })
})