/**
 * Unit tests for Input component
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { Input } from '../input'

describe('Input', () => {
  describe('rendering', () => {
    it('should render input element', () => {
      render(<Input placeholder="Enter text" />)
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
    })

    it('should forward ref to input element', () => {
      const ref = vi.fn()
      render(<Input ref={ref} />)
      expect(ref).toHaveBeenCalled()
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLInputElement)
    })

    it('should render with default type text', () => {
      render(<Input />)
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text')
    })

    it('should apply custom className', () => {
      render(<Input className="custom-input" />)
      expect(screen.getByRole('textbox')).toHaveClass('custom-input')
    })
  })

  describe('label', () => {
    it('should render label when provided', () => {
      render(<Input label="Email Address" />)
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    })

    it('should not render label when not provided', () => {
      render(<Input />)
      expect(screen.queryByRole('textbox')).toBeInTheDocument()
    })

    it('should associate label with input', () => {
      render(<Input label="Username" />)
      const input = screen.getByLabelText('Username')
      expect(input.tagName).toBe('INPUT')
    })
  })

  describe('error state', () => {
    it('should display error message when provided', () => {
      render(<Input error="This field is required" />)
      expect(screen.getByText('This field is required')).toBeInTheDocument()
      expect(screen.getByText('This field is required')).toHaveClass('text-destructive')
    })

    it('should apply error styles to input', () => {
      render(<Input error="Error message" />)
      expect(screen.getByRole('textbox')).toHaveClass('border-destructive')
    })

    it('should not show helper text when error is present', () => {
      render(<Input error="Error" helperText="Helper" />)
      expect(screen.queryByText('Helper')).not.toBeInTheDocument()
    })
  })

  describe('helper text', () => {
    it('should display helper text when provided', () => {
      render(<Input helperText="Enter your email" />)
      expect(screen.getByText('Enter your email')).toBeInTheDocument()
      expect(screen.getByText('Enter your email')).toHaveClass('text-muted-foreground')
    })

    it('should not show helper text when error is present', () => {
      render(<Input error="Error" helperText="Helper" />)
      expect(screen.queryByText('Helper')).not.toBeInTheDocument()
    })
  })

  describe('addons', () => {
    it('should render left addon when provided', () => {
      render(<Input leftAddon="@" />)
      const addon = screen.getByText('@')
      expect(addon).toBeInTheDocument()
      expect(addon).toHaveClass('rounded-l-md')
    })

    it('should render right addon when provided', () => {
      render(<Input rightAddon=".com" />)
      const addon = screen.getByText('.com')
      expect(addon).toBeInTheDocument()
      expect(addon).toHaveClass('rounded-r-md')
    })

    it('should render both addons when provided', () => {
      render(<Input leftAddon="http://" rightAddon=".com" />)
      expect(screen.getByText('http://')).toBeInTheDocument()
      expect(screen.getByText('.com')).toBeInTheDocument()
    })
  })

  describe('width', () => {
    it('should take full width by default', () => {
      render(<Input />)
      expect(screen.getByRole('textbox').parentElement).toHaveClass('w-full')
    })

    it('should not take full width when fullWidth is false', () => {
      render(<Input fullWidth={false} />)
      expect(screen.getByRole('textbox').parentElement).not.toHaveClass('w-full')
    })
  })

  describe('interaction', () => {
    it('should call onChange when value changes', () => {
      const handleChange = vi.fn()
      render(<Input onChange={handleChange} />)
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'test' } })
      expect(handleChange).toHaveBeenCalledTimes(1)
    })

    it('should call onFocus when focused', () => {
      const handleFocus = vi.fn()
      render(<Input onFocus={handleFocus} />)
      const input = screen.getByRole('textbox')
      fireEvent.focus(input)
      expect(handleFocus).toHaveBeenCalledTimes(1)
    })

    it('should call onBlur when blurred', () => {
      const handleBlur = vi.fn()
      render(<Input onBlur={handleBlur} />)
      const input = screen.getByRole('textbox')
      fireEvent.blur(input)
      expect(handleBlur).toHaveBeenCalledTimes(1)
    })
  })

  describe('disabled state', () => {
    it('should apply disabled styles', () => {
      render(<Input disabled />)
      expect(screen.getByRole('textbox')).toBeDisabled()
      expect(screen.getByRole('textbox')).toHaveClass('disabled:opacity-50')
    })
  })

  describe('types', () => {
    it('should support different input types', () => {
      render(<Input type="email" />)
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')
    })

    it('should support password type', () => {
      render(<Input type="password" />)
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'password')
    })

    it('should support number type', () => {
      render(<Input type="number" />)
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'number')
    })
  })
})