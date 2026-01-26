'use client'

import {
  useEffect,
  useCallback,
  type ReactNode,
  type ReactElement,
} from 'react'
import { createPortal } from 'react-dom'

export interface ModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean
  /**
   * Callback when modal should close
   */
  onClose: () => void
  /**
   * Modal title
   */
  title?: string
  /**
   * Modal content
   */
  children: ReactNode
  /**
   * Footer content (buttons, actions)
   */
  footer?: ReactNode
  /**
   * Size of the modal
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /**
   * Whether to show close button
   * @default true
   */
  showCloseButton?: boolean
  /**
   * Whether to close on backdrop click
   * @default true
   */
  closeOnBackdropClick?: boolean
  /**
   * Whether to close on Escape key
   * @default true
   */
  closeOnEscape?: boolean
  /**
   * Custom close icon
   */
  closeIcon?: ReactElement
}

/**
 * Modal component with portal rendering and accessibility features
 *
 * @example
 * ```tsx
 * // Basic usage
 * const [isOpen, setIsOpen] = useState(false)
 *
 * <Modal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Modal Title"
 * >
 *   <p>Modal content goes here</p>
 *   <Modal.Footer>
 *     <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
 *     <Button onClick={handleConfirm}>Confirm</Button>
 *   </Modal.Footer>
 * </Modal>
 *
 * // Different sizes
 * <Modal isOpen={isOpen} onClose={onClose} size="sm">Small</Modal>
 * <Modal isOpen={isOpen} onClose={onClose} size="lg">Large</Modal>
 * <Modal isOpen={isOpen} onClose={onClose} size="full">Full screen</Modal>
 *
 * // Custom footer
 * <Modal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   footer={
 *     <>
 *       <Button variant="secondary">Save Draft</Button>
 *       <Button>Publish</Button>
 *     </>
 *   }
 * >
 *   Content
 * </Modal>
 * ```
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  closeIcon,
}: ModalProps) {
  // Handle escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape) {
        onClose()
      }
    },
    [closeOnEscape, onClose],
  )

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && closeOnBackdropClick) {
      onClose()
    }
  }

  // Add/remove event listeners
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleKeyDown])

  // Don't render if closed
  if (!isOpen) {
    return null
  }

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  }

  const defaultCloseIcon = (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  )

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className={`
          w-full animate-in fade-in-0 zoom-in-95
          ${sizeClasses[size]}
          rounded-lg bg-background text-foreground shadow-lg
          duration-200
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between border-b px-6 py-4">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="ml-auto rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Close modal"
              >
                {closeIcon || defaultCloseIcon}
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

/**
 * Footer sub-component for Modal
 */
export function ModalFooter({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`flex items-center justify-end gap-2 ${className}`}>{children}</div>
}

Modal.Footer = ModalFooter

export default Modal