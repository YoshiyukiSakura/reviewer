/**
 * UI Component Library
 *
 * A collection of reusable UI components built with React, TypeScript, and Tailwind CSS.
 *
 * @example
 * ```tsx
 * import { Button, Card, Input, Modal, Table, Badge } from '@/lib/ui'
 * ```
 */

// Button
export { Button, default as ButtonDefault } from './button'
export type { ButtonProps } from './button'

// Input
export { Input, default as InputDefault } from './input'
export type { InputProps } from './input'

// Card
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  default as CardDefault,
} from './card'
export type { CardProps, CardHeaderProps, CardTitleProps, CardDescriptionProps, CardContentProps, CardFooterProps } from './card'

// Modal
export { Modal, ModalFooter, default as ModalDefault } from './modal'
export type { ModalProps } from './modal'

// Table
export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHeadCell,
  default as TableDefault,
} from './table'
export type { TableProps, Column, TableHeaderProps, TableBodyProps, TableRowProps, TableCellProps, TableHeadCellProps } from './table'

// Badge
export { Badge, default as BadgeDefault } from './badge'
export type { BadgeProps } from './badge'