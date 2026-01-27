'use client'

import { type HTMLAttributes, type ReactNode } from 'react'

export interface Column<T> {
  /**
   * Column key/field name
   */
  key: Extract<keyof T, string> | string
  /**
   * Column header title
   */
  title: string
  /**
   * Custom render function for cell content
   */
  render?: (item: T, index: number) => ReactNode
  /**
   * CSS class name for the column
   */
  className?: string
  /**
   * Column width
   */
  width?: string
  /**
   * Whether the column is sortable
   */
  sortable?: boolean
}

export interface TableProps<T> extends HTMLAttributes<HTMLTableElement> {
  /**
   * Array of column definitions
   */
  columns: Column<T>[]
  /**
   * Array of data items
   */
  data: T[]
  /**
   * Key function to get unique row identifier
   */
  rowKey?: keyof T | string | ((item: T) => string | number)
  /**
   * Whether the table is loading
   * @default false
   */
  isLoading?: boolean
  /**
   * Custom empty state content
   */
  emptyMessage?: string | ReactNode
  /**
   * Whether rows are selectable
   */
  selectable?: boolean
  /**
   * Selected row keys
   */
  selectedKeys?: (string | number)[]
  /**
   * Callback when selection changes
   */
  onSelectionChange?: (keys: (string | number)[]) => void
  /**
   * Callback when a row is clicked
   */
  onRowClick?: (item: T, index: number) => void
  /**
   * Whether rows have hover effect
   * @default true
   */
  hoverable?: boolean
  /**
   * Table size
   * @default 'default'
   */
  size?: 'sm' | 'default' | 'lg'
}

export interface TableHeaderProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode
}

export interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  children: ReactNode
  isSelected?: boolean
  onClick?: () => void
}

export interface TableCellProps extends HTMLAttributes<HTMLTableCellElement> {
  children: ReactNode
}

export interface TableHeadCellProps extends HTMLAttributes<HTMLTableCellElement> {
  children: ReactNode
  sortable?: boolean
  sortDirection?: 'asc' | 'desc' | null
}

/**
 * Data table component with sorting, selection, and customization support
 *
 * @example
 * ```tsx
 * interface User {
 *   id: number
 *   name: string
 *   email: string
 *   role: string
 * }
 *
 * const columns: Column<User>[] = [
 *   { key: 'name', title: 'Name' },
 *   { key: 'email', title: 'Email' },
 *   {
 *     key: 'role',
 *     title: 'Role',
 *     render: (user) => <Badge>{user.role}</Badge>
 *   },
 * ]
 *
 * <Table columns={columns} data={users} rowKey="id" />
 *
 * // With selection
 * <Table
 *   columns={columns}
 *   data={users}
 *   rowKey="id"
 *   selectable
 *   selectedKeys={selectedIds}
 *   onSelectionChange={setSelectedIds}
 * />
 *
 * // With row click
 * <Table
 *   columns={columns}
 *   data={users}
 *   rowKey="id"
 *   onRowClick={(user) => navigateTo(`/users/${user.id}`)}
 * />
 * ```
 */
export function Table<T>({
  className = '',
  columns,
  data,
  rowKey = 'id',
  isLoading = false,
  emptyMessage = 'No data available',
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  onRowClick,
  hoverable = true,
  size = 'default',
  ...props
}: TableProps<T>) {
  const getRowKey = (item: T, index: number): string | number => {
    if (typeof rowKey === 'function') {
      return rowKey(item)
    }
    return item[rowKey as keyof T] as string | number
  }

  const isSelected = (item: T): boolean => {
    const key = getRowKey(item, 0)
    return selectedKeys.includes(key)
  }

  const handleSelect = (item: T) => {
    if (!onSelectionChange) return
    const key = getRowKey(item, 0)
    const newKeys = selectedKeys.includes(key)
      ? selectedKeys.filter((k) => k !== key)
      : [...selectedKeys, key]
    onSelectionChange(newKeys)
  }

  const handleSelectAll = () => {
    if (!onSelectionChange) return
    if (selectedKeys.length === data.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(data.map((item, i) => getRowKey(item, i)))
    }
  }

  const sizeClasses = {
    sm: 'h-8 text-sm',
    default: 'h-12',
    lg: 'h-16 text-lg',
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`w-full overflow-hidden rounded-md border ${className}`}>
        <table className="w-full caption-bottom text-sm">
          <thead className="bg-muted/50">
            <tr>
              {selectable && <th className="w-12 p-4"><div className="h-4 w-4 animate-pulse rounded bg-muted" /></th>}
              {columns.map((col, i) => (
                <th key={i} className="h-10 px-4 text-left font-medium text-muted-foreground">
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-background">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-t">
                {selectable && <td className="p-4"><div className="h-4 w-4 animate-pulse rounded bg-muted" /></td>}
                {columns.map((_, j) => (
                  <td key={j} className="p-4"><div className="h-4 w-full animate-pulse rounded bg-muted" /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={`w-full overflow-hidden rounded-md border ${className}`}>
        <table className="w-full caption-bottom text-sm">
          <thead className="bg-muted/50">
            <tr>
              {selectable && <th className="w-12 p-4" />}
              {columns.map((col, i) => (
                <th key={i} className="h-10 px-4 text-left font-medium text-muted-foreground">
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          {emptyMessage}
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full overflow-hidden rounded-md border ${className}`}>
      <table className="w-full caption-bottom text-sm" {...props}>
        <thead className="bg-muted/50">
          <tr>
            {selectable && (
              <th className="w-12 p-4">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input cursor-pointer"
                  checked={selectedKeys.length === data.length}
                  onChange={handleSelectAll}
                  aria-label="Select all rows"
                />
              </th>
            )}
            {columns.map((col, i) => (
              <th
                key={i}
                className={`h-10 px-4 text-left font-medium text-muted-foreground ${col.className || ''}`}
                style={{ width: col.width }}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-background">
          {data.map((item, index) => {
            const rowId = getRowKey(item, index)
            const selected = isSelected(item)
            return (
              <tr
                key={rowId}
                className={`
                  border-t transition-colors
                  ${hoverable ? 'hover:bg-muted/50' : ''}
                  ${selected ? 'bg-muted/50' : ''}
                  ${onRowClick ? 'cursor-pointer' : ''}
                `}
                onClick={() => onRowClick?.(item, index)}
              >
                {selectable && (
                  <td className="p-4">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input cursor-pointer"
                      checked={selected}
                      onChange={() => handleSelect(item)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select row ${index + 1}`}
                    />
                  </td>
                )}
                {columns.map((col, colIndex) => {
                  const cellKey = col.key as string
                  return (
                    <td
                      key={colIndex}
                      className={`p-4 ${sizeClasses[size]} ${col.className || ''}`}
                      style={{ width: col.width }}
                    >
                      {col.render
                        ? col.render(item, index)
                        : (item as Record<string, unknown>)[cellKey] as ReactNode}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Table header component for custom table structures
 */
export function TableHeader({ className = '', children, ...props }: TableHeaderProps) {
  return (
    <thead className={`bg-muted/50 ${className}`} {...props}>
      {children}
    </thead>
  )
}

/**
 * Table body component for custom table structures
 */
export function TableBody({ className = '', children, ...props }: TableBodyProps) {
  return (
    <tbody className={`bg-background ${className}`} {...props}>
      {children}
    </tbody>
  )
}

/**
 * Table row component for custom table structures
 */
export function TableRow({
  className = '',
  children,
  isSelected = false,
  onClick,
  ...props
}: TableRowProps) {
  return (
    <tr
      className={`
        border-t transition-colors
        ${isSelected ? 'bg-muted/50' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      {...props}
    >
      {children}
    </tr>
  )
}

/**
 * Table cell component for custom table structures
 */
export function TableCell({ className = '', children, ...props }: TableCellProps) {
  return (
    <td className={`p-4 ${className}`} {...props}>
      {children}
    </td>
  )
}

/**
 * Table head cell component for custom table structures
 */
export function TableHeadCell({
  className = '',
  children,
  sortable,
  sortDirection,
  ...props
}: TableHeadCellProps) {
  return (
    <th
      className={`
        h-10 px-4 text-left font-medium text-muted-foreground
        ${sortable ? 'cursor-pointer select-none hover:bg-muted' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
      {sortable && sortDirection && (
        <span className="ml-1">
          {sortDirection === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </th>
  )
}

export default Table