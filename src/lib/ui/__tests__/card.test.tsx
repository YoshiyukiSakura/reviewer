/**
 * Unit tests for Card components
 */

import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card'

describe('Card', () => {
  describe('Card', () => {
    it('should render card container', () => {
      render(<Card>Card content</Card>)
      expect(screen.getByText('Card content')).toBeInTheDocument()
    })

    it('should apply base styles', () => {
      render(<Card />)
      const card = screen.getByText('')
      expect(card).toHaveClass('rounded-lg')
      expect(card).toHaveClass('bg-card')
      expect(card).toHaveClass('shadow-sm')
    })

    it('should apply custom className', () => {
      render(<Card className="custom-card" />)
      expect(screen.getByText('')).toHaveClass('custom-card')
    })

    it('should apply hoverable styles when hoverable is true', () => {
      render(<Card hoverable>Hoverable</Card>)
      expect(screen.getByText('Hoverable')).toHaveClass('transition-shadow')
      expect(screen.getByText('Hoverable')).toHaveClass('hover:shadow-md')
    })

    it('should not apply hoverable styles when hoverable is false', () => {
      render(<Card>Not hoverable</Card>)
      expect(screen.getByText('Not hoverable')).not.toHaveClass('hover:shadow-md')
    })
  })

  describe('CardHeader', () => {
    it('should render header content', () => {
      render(<CardHeader>Header content</CardHeader>)
      expect(screen.getByText('Header content')).toBeInTheDocument()
    })

    it('should apply header styles', () => {
      render(<CardHeader />)
      expect(screen.getByText('')).toHaveClass('flex')
      expect(screen.getByText('')).toHaveClass('flex-col')
      expect(screen.getByText('')).toHaveClass('p-6')
    })

    it('should apply custom className', () => {
      render(<CardHeader className="custom-header" />)
      expect(screen.getByText('')).toHaveClass('custom-header')
    })
  })

  describe('CardTitle', () => {
    it('should render title content', () => {
      render(<CardTitle>Title text</CardTitle>)
      expect(screen.getByText('Title text')).toBeInTheDocument()
    })

    it('should render as h3 element', () => {
      render(<CardTitle />)
      expect(screen.getByText('').tagName).toBe('H3')
    })

    it('should apply title styles', () => {
      render(<CardTitle />)
      expect(screen.getByText('')).toHaveClass('text-xl')
      expect(screen.getByText('')).toHaveClass('font-semibold')
    })
  })

  describe('CardDescription', () => {
    it('should render description content', () => {
      render(<CardDescription>Description text</CardDescription>)
      expect(screen.getByText('Description text')).toBeInTheDocument()
    })

    it('should render as p element', () => {
      render(<CardDescription />)
      expect(screen.getByText('').tagName).toBe('P')
    })

    it('should apply description styles', () => {
      render(<CardDescription />)
      expect(screen.getByText('')).toHaveClass('text-sm')
      expect(screen.getByText('')).toHaveClass('text-muted-foreground')
    })
  })

  describe('CardContent', () => {
    it('should render content', () => {
      render(<CardContent>Content text</CardContent>)
      expect(screen.getByText('Content text')).toBeInTheDocument()
    })

    it('should apply content styles', () => {
      render(<CardContent />)
      expect(screen.getByText('')).toHaveClass('p-6')
      expect(screen.getByText('')).toHaveClass('pt-0')
    })
  })

  describe('CardFooter', () => {
    it('should render footer content', () => {
      render(<CardFooter>Footer content</CardFooter>)
      expect(screen.getByText('Footer content')).toBeInTheDocument()
    })

    it('should apply footer styles', () => {
      render(<CardFooter />)
      expect(screen.getByText('')).toHaveClass('flex')
      expect(screen.getByText('')).toHaveClass('items-center')
      expect(screen.getByText('')).toHaveClass('p-6')
    })

    it('should apply end alignment by default', () => {
      render(<CardFooter />)
      expect(screen.getByText('')).toHaveClass('justify-end')
    })

    it('should apply start alignment', () => {
      render(<CardFooter align="start">Footer</CardFooter>)
      expect(screen.getByText('Footer')).toHaveClass('justify-start')
    })

    it('should apply center alignment', () => {
      render(<CardFooter align="center">Footer</CardFooter>)
      expect(screen.getByText('Footer')).toHaveClass('justify-center')
    })

    it('should apply between alignment', () => {
      render(<CardFooter align="between">Footer</CardFooter>)
      expect(screen.getByText('Footer')).toHaveClass('justify-between')
    })
  })

  describe('nested components', () => {
    it('should render full card structure', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>Card Content</CardContent>
          <CardFooter>Card Footer</CardFooter>
        </Card>
      )

      expect(screen.getByText('Card Title')).toBeInTheDocument()
      expect(screen.getByText('Card Description')).toBeInTheDocument()
      expect(screen.getByText('Card Content')).toBeInTheDocument()
      expect(screen.getByText('Card Footer')).toBeInTheDocument()
    })
  })
})