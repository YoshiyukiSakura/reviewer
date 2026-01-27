/**
 * Unit tests for Modal component
 */

import { render, screen, fireEvent, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { Modal, ModalFooter } from '../modal'

// Mock createPortal
vi.mock('react-dom', () => ({
  ...vi.importActual('react-dom'),
  createPortal: (children: React.ReactNode) => children,
}))

describe('Modal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  describe('rendering', () => {
    it('should render null when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={mockOnClose}>
          Modal content
        </Modal>
      )
      expect(screen.queryByText('Modal content')).not.toBeInTheDocument()
    })

    it('should render modal content when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          Modal content
        </Modal>
      )
      expect(screen.getByText('Modal content')).toBeInTheDocument()
    })

    it('should render with correct role', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          Content
        </Modal>
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('title', () => {
    it('should render title when provided', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Modal Title">
          Content
        </Modal>
      )
      expect(screen.getByText('Modal Title')).toBeInTheDocument()
    })

    it('should not render title when not provided', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          Content
        </Modal>
      )
      expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    })
  })

  describe('close button', () => {
    it('should show close button by default', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          Content
        </Modal>
      )
      expect(screen.getByLabelText('Close modal')).toBeInTheDocument()
    })

    it('should hide close button when showCloseButton is false', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} showCloseButton={false}>
          Content
        </Modal>
      )
      expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument()
    })

    it('should call onClose when close button is clicked', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          Content
        </Modal>
      )
      fireEvent.click(screen.getByLabelText('Close modal'))
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('footer', () => {
    it('should render footer when provided', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} footer={<button>Action</button>}>
          Content
        </Modal>
      )
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
    })

    it('should not render footer when not provided', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          Content
        </Modal>
      )
      // Check that there's no footer div with buttons
      const buttons = screen.queryAllByRole('button')
      expect(buttons.filter(btn => btn.getAttribute('aria-label') !== 'Close modal')).toHaveLength(0)
    })
  })

  describe('sizes', () => {
    it('should apply default (md) size', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          Content
        </Modal>
      )
      const modalContent = screen.getByText('Content').closest('div')?.parentElement
      expect(modalContent).toHaveClass('max-w-md')
    })

    it('should apply small size', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} size="sm">
          Content
        </Modal>
      )
      const modalContent = screen.getByText('Content').closest('div')?.parentElement
      expect(modalContent).toHaveClass('max-w-sm')
    })

    it('should apply large size', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} size="lg">
          Content
        </Modal>
      )
      const modalContent = screen.getByText('Content').closest('div')?.parentElement
      expect(modalContent).toHaveClass('max-w-lg')
    })

    it('should apply extra large size', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} size="xl">
          Content
        </Modal>
      )
      const modalContent = screen.getByText('Content').closest('div')?.parentElement
      expect(modalContent).toHaveClass('max-w-xl')
    })

    it('should apply full size', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} size="full">
          Content
        </Modal>
      )
      const modalContent = screen.getByText('Content').closest('div')?.parentElement
      expect(modalContent).toHaveClass('max-w-4xl')
    })
  })

  describe('backdrop click', () => {
    it('should call onClose when backdrop is clicked', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          Content
        </Modal>
      )
      const backdrop = screen.getByRole('dialog').parentElement
      fireEvent.click(backdrop!)
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should not call onClose when closeOnBackdropClick is false', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} closeOnBackdropClick={false}>
          Content
        </Modal>
      )
      const backdrop = screen.getByRole('dialog').parentElement
      fireEvent.click(backdrop!)
      expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('should not call onClose when clicking modal content', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          Content
        </Modal>
      )
      const content = screen.getByText('Content')
      fireEvent.click(content)
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('escape key', () => {
    it('should call onClose when escape is pressed', async () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          Content
        </Modal>
      )

      await act(async () => {
        fireEvent.keyDown(document, { key: 'Escape' })
      })

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should not call onClose when closeOnEscape is false', async () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} closeOnEscape={false}>
          Content
        </Modal>
      )

      await act(async () => {
        fireEvent.keyDown(document, { key: 'Escape' })
      })

      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('ModalFooter', () => {
    it('should render footer content', () => {
      render(<ModalFooter>Footer content</ModalFooter>)
      expect(screen.getByText('Footer content')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(<ModalFooter className="custom-footer">Footer</ModalFooter>)
      expect(screen.getByText('Footer')).toHaveClass('custom-footer')
    })
  })
})