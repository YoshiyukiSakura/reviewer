/**
 * Unit tests for Button component
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { Button } from '../button'

describe('Button', () => {
  describe('rendering', () => {
    it('should render button with children', () => {
      render(<Button>Click me</Button>)
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
    })

    it('should render as button element', () => {
      render(<Button>Test</Button>)
      const button = screen.getByRole('button')
      expect(button.tagName).toBe('BUTTON')
    })

    it('should forward ref to button element', () => {
      const ref = vi.fn()
      render(<Button ref={ref}>Ref Test</Button>)
      expect(ref).toHaveBeenCalled()
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLButtonElement)
    })

    it('should render with default variant and size', () => {
      render(<Button>Default</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-primary')
      expect(button).toHaveClass('h-10')
    })

    it('should apply custom className', () => {
      render(<Button className="custom-class">Custom</Button>)
      expect(screen.getByRole('button')).toHaveClass('custom-class')
    })
  })

  describe('variants', () => {
    it('should apply default variant styles', () => {
      render(<Button variant="default">Default</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-primary')
    })

    it('should apply destructive variant styles', () => {
      render(<Button variant="destructive">Delete</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-destructive')
    })

    it('should apply outline variant styles', () => {
      render(<Button variant="outline">Outline</Button>)
      expect(screen.getByRole('button')).toHaveClass('border')
    })

    it('apply secondary variant styles', () => {
      render(<Button variant="secondary">Secondary</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-secondary')
    })

    it('should apply ghost variant styles', () => {
      render(<Button variant="ghost">Ghost</Button>)
      expect(screen.getByRole('button')).toHaveClass('hover:bg-accent')
    })

    it('should apply link variant styles', () => {
      render(<Button variant="link">Link</Button>)
      expect(screen.getByRole('button')).toHaveClass('underline-offset-4')
    })
  })

  describe('sizes', () => {
    it('should apply small size styles', () => {
      render(<Button size="sm">Small</Button>)
      expect(screen.getByRole('button')).toHaveClass('h-9')
    })

    it('should apply default size styles', () => {
      render(<Button size="default">Default</Button>)
      expect(screen.getByRole('button')).toHaveClass('h-10')
    })

    it('should apply large size styles', () => {
      render(<Button size="lg">Large</Button>)
      expect(screen.getByRole('button')).toHaveClass('h-11')
    })

    it('should apply icon size styles', () => {
      render(<Button size="icon">Icon</Button>)
      expect(screen.getByRole('button')).toHaveClass('h-10')
      expect(screen.getByRole('button')).toHaveClass('w-10')
    })
  })

  describe('loading state', () => {
    it('should show loading spinner when isLoading is true', () => {
      render(<Button isLoading>Loading</Button>)
      expect(screen.getByRole('button')).toBeDisabled()
      expect(screen.getByRole('button')).toHaveTextContent('')
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should disable button when loading', () => {
      render(<Button isLoading>Loading</Button>)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('should disable button when disabled is true', () => {
      render(<Button disabled>Disabled</Button>)
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })

  describe('icons', () => {
    it('should render left icon when provided', () => {
      render(
        <Button leftIcon={<span data-testid="left-icon">+</span>}>
          Add Item
        </Button>
      )
      expect(screen.getByTestId('left-icon')).toBeInTheDocument()
    })

    it('should render right icon when provided', () => {
      render(
        <Button rightIcon={<span data-testid="right-icon">→</span>}>
          Next
        </Button>
      )
      expect(screen.getByTestId('right-icon')).toBeInTheDocument()
    })

    it('should hide left icon when loading', () => {
      render(
        <Button isLoading leftIcon={<span data-testid="left-icon">+</span>}>
          Loading
        </Button>
      )
      expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument()
    })
  })

  describe('interaction', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Click</Button>)
      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should not call onClick when disabled', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick} disabled>Disabled</Button>)
      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('should not call onClick when loading', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick} isLoading>Loading</Button>)
      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('should be focusable', () => {
      render(<Button>Focusable</Button>)
      expect(screen.getByRole('button')).toHaveFocus()
    })

    it('should support aria attributes', () => {
      render(<Button aria-label="Custom label">Button</Button>)
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Custom label')
    })
  })
})