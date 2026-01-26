'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface SidebarProps {
  /**
   * Logo or brand name to display at the top
   */
  logo?: ReactNode
  /**
   * Navigation items
   */
  items?: SidebarItem[]
  /**
   * Additional content at the bottom
   */
  footer?: ReactNode
  /**
   * Custom class name
   */
  className?: string
  /**
   * Whether the sidebar is collapsible (mobile)
   * @default true
   */
  collapsible?: boolean
}

export interface SidebarItem {
  /**
   * Label to display
   */
  label: string
  /**
   * URL path
   */
  href: string
  /**
   * Icon to display
   */
  icon?: ReactNode
  /**
   * Badge or count to display
   */
  badge?: ReactNode | number
}

/**
 * Default navigation items for the sidebar
 */
export const defaultSidebarItems: SidebarItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Reviews', href: '/reviews' },
  { label: 'Settings', href: '/settings' },
]

/**
 * Sidebar component for vertical navigation
 *
 * @example
 * ```tsx
 * <Sidebar
 *   logo={<span className="font-bold">My App</span>}
 *   items={[
 *     { label: 'Dashboard', href: '/dashboard', icon: <DashboardIcon /> },
 *     { label: 'Reviews', href: '/reviews', icon: <ReviewIcon /> },
 *   ]}
 *   footer={<UserProfile />}
 * />
 * ```
 */
export function Sidebar({
  logo,
  items = defaultSidebarItems,
  footer,
  className = '',
  collapsible = true,
}: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 w-64 flex flex-col
        border-r border-border bg-background
        transition-transform duration-200 ease-in-out
        ${collapsible ? 'lg:translate-x-0' : 'lg:translate-x-0'}
        ${className}
      `}
    >
      {/* Logo */}
      {logo && (
        <div className="flex h-16 items-center border-b border-border px-4">
          <Link href="/" className="flex items-center gap-2">
            {logo}
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md
                    transition-colors
                    ${isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }
                  `}
                >
                  {item.icon && <span className="h-4 w-4 flex-shrink-0">{item.icon}</span>}
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="text-xs text-muted-foreground">{item.badge}</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      {footer && (
        <div className="border-t border-border p-4">
          {footer}
        </div>
      )}
    </aside>
  )
}

/**
 * Mobile sidebar overlay component
 */
export function SidebarOverlay({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Sidebar container */}
      <div className="fixed inset-y-0 left-0 w-64">
        {children}
      </div>
    </div>
  )
}

export default Sidebar