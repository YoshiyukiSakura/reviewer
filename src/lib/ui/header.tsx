'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface HeaderProps {
  /**
   * Logo or brand name
   */
  logo?: ReactNode
  /**
   * Navigation items
   */
  items?: HeaderItem[]
  /**
   * Additional actions on the right side
   */
  actions?: ReactNode
  /**
   * Custom class name
   */
  className?: string
}

export interface HeaderItem {
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
}

/**
 * Default navigation items for the application
 */
export const defaultNavItems: HeaderItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Reviews', href: '/reviews' },
  { label: 'Settings', href: '/settings' },
]

/**
 * Header component for top navigation
 *
 * @example
 * ```tsx
 * <Header
 *   logo={<span className="font-bold">My App</span>}
 *   items={[
 *     { label: 'Home', href: '/' },
 *     { label: 'About', href: '/about' },
 *   ]}
 *   actions={<UserMenu />}
 * />
 * ```
 */
export function Header({
  logo,
  items = defaultNavItems,
  actions,
  className = '',
}: HeaderProps) {
  const pathname = usePathname()

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${className}`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-6">
          {logo && <Link href="/">{logo}</Link>}
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  inline-flex items-center gap-2 px-3 py-2 text-sm font-medium
                  rounded-md transition-colors
                  ${isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }
                `}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {actions}
        </div>
      </div>
    </header>
  )
}

export default Header