'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useReviews } from '@/lib/react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/lib/ui'
import { Table, type Column } from '@/lib/ui/table'
import { Badge } from '@/lib/ui/badge'
import { Button } from '@/lib/ui/button'
import { Input } from '@/lib/ui/input'
import type { Review, ReviewFilterParams, ReviewStatus, PaginatedResponse } from '@/types'

/**
 * Status badge configuration
 */
const statusConfig: Record<ReviewStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' }> = {
  PENDING: { label: 'Pending', variant: 'warning' },
  IN_PROGRESS: { label: 'In Progress', variant: 'default' },
  APPROVED: { label: 'Approved', variant: 'success' },
  CHANGES_REQUESTED: { label: 'Changes Requested', variant: 'secondary' },
  CLOSED: { label: 'Closed', variant: 'destructive' },
}

/**
 * Format date to readable string
 */
function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Sort options configuration
 */
const sortOptions = [
  { value: 'createdAt', label: 'Created At' },
  { value: 'updatedAt', label: 'Updated At' },
  { value: 'title', label: 'Title' },
  { value: 'status', label: 'Status' },
]

/**
 * Filter bar component with search, status filter, and sort controls
 */
interface FilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  statusFilter: ReviewStatus | ''
  onStatusFilterChange: (value: ReviewStatus | '') => void
  sortBy: string
  onSortByChange: (value: string) => void
  sortOrder: 'asc' | 'desc'
  onSortOrderChange: (value: 'asc' | 'desc') => void
}

function FilterBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      {/* Search input */}
      <div className="flex-1">
        <Input
          placeholder="Search reviews..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          leftAddon="🔍"
        />
      </div>

      {/* Status filter */}
      <div className="w-full sm:w-48">
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as ReviewStatus | '')}
        >
          <option value="">All Statuses</option>
          {Object.entries(statusConfig).map(([value, config]) => (
            <option key={value} value={value}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      {/* Sort controls */}
      <div className="flex gap-2">
        <select
          className="flex h-10 w-36 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          size="default"
          onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </Button>
      </div>
    </div>
  )
}

/**
 * Pagination component
 */
interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pages = useMemo(() => {
    if (totalPages <= 1) return []

    const result: (number | 'ellipsis')[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        result.push(i)
      }
    } else {
      result.push(1)
      if (currentPage > 3) result.push('ellipsis')

      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      for (let i = start; i <= end; i++) {
        result.push(i)
      }

      if (currentPage < totalPages - 2) result.push('ellipsis')
      result.push(totalPages)
    }

    return result
  }, [currentPage, totalPages])

  if (pages.length === 0) return null

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Previous
      </Button>
      {pages.map((page, index) =>
        page === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
            ...
          </span>
        ) : (
          <Button
            key={page}
            variant={currentPage === page ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        )
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        Next
      </Button>
    </div>
  )
}

/**
 * Reviews table skeleton loading state
 */
function ReviewsTableSkeleton() {
  return (
    <div className="w-full overflow-hidden rounded-md border">
      <table className="w-full caption-bottom text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Title</th>
            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Status</th>
            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Author</th>
            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Comments</th>
            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Created</th>
          </tr>
        </thead>
        <tbody className="bg-background">
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="border-t">
              <td className="p-4"><div className="h-4 w-full animate-pulse rounded bg-muted" /></td>
              <td className="p-4"><div className="h-6 w-20 animate-pulse rounded bg-muted" /></td>
              <td className="p-4"><div className="h-4 w-24 animate-pulse rounded bg-muted" /></td>
              <td className="p-4"><div className="h-4 w-8 animate-pulse rounded bg-muted" /></td>
              <td className="p-4"><div className="h-4 w-32 animate-pulse rounded bg-muted" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Empty state component
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <span className="text-3xl">📋</span>
      </div>
      <h3 className="text-lg font-semibold mb-2">No reviews found</h3>
      <p className="text-muted-foreground mb-4">
        Try adjusting your search or filter criteria
      </p>
      <Button
        variant="outline"
        onClick={() => {
          window.location.reload()
        }}
      >
        Clear Filters
      </Button>
    </div>
  )
}

/**
 * Reviews list page component
 */
export default function ReviewsListPage() {
  // Filter state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | ''>('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('')
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Reset page when filters change
  const handleFilterChange = useCallback(() => {
    setPage(1)
  }, [search, statusFilter, sortBy, sortOrder])

  // Apply filters
  const filters: ReviewFilterParams = useMemo(
    () => ({
      page,
      pageSize,
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      sortBy,
      sortOrder,
    }),
    [page, pageSize, debouncedSearch, statusFilter, sortBy, sortOrder]
  )

  // Fetch reviews
  const {
    reviews,
    total,
    isLoading,
    error,
    refetch,
  } = useReviews({
    filters,
    select: (data: PaginatedResponse<Review>) => data,
  })

  const totalPages = useMemo(() => {
    return Math.ceil(total / pageSize) || 1
  }, [total, pageSize])

  // Table columns configuration
  const columns: Column<Review>[] = useMemo(
    () => [
      {
        key: 'title',
        title: 'Title',
        render: (review) => (
          <div className="max-w-md">
            <p className="font-medium truncate">{review.title}</p>
            {review.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {review.description}
              </p>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        title: 'Status',
        render: (review) => {
          const config = statusConfig[review.status] || statusConfig.PENDING
          return <Badge variant={config.variant}>{config.label}</Badge>
        },
        width: '140px',
      },
      {
        key: 'authorName',
        title: 'Author',
        render: (review) => review.authorName || 'Anonymous',
        width: '120px',
      },
      {
        key: 'comments',
        title: 'Comments',
        render: (review) => (
          <span className="text-muted-foreground">
            {review.comments?.length || 0}
          </span>
        ),
        width: '80px',
      },
      {
        key: 'createdAt',
        title: 'Created',
        render: (review) => (
          <span className="text-muted-foreground text-sm">
            {formatDate(review.createdAt)}
          </span>
        ),
        width: '150px',
      },
    ],
    []
  )

  const handleRowClick = (review: Review) => {
    window.location.href = `/reviews/${review.id}`
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
        <p className="text-muted-foreground mt-2">
          Manage and review code submissions
        </p>
      </div>

      {/* Error state */}
      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <span className="text-destructive">Error loading reviews</span>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main content card */}
      <Card>
        <CardHeader>
          <CardTitle>All Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filter bar */}
          <FilterBar
            search={search}
            onSearchChange={(value) => {
              setSearch(value)
              handleFilterChange()
            }}
            statusFilter={statusFilter}
            onStatusFilterChange={(value) => {
              setStatusFilter(value)
              handleFilterChange()
            }}
            sortBy={sortBy}
            onSortByChange={(value) => {
              setSortBy(value)
              handleFilterChange()
            }}
            sortOrder={sortOrder}
            onSortOrderChange={(value) => {
              setSortOrder(value)
              handleFilterChange()
            }}
          />

          {/* Table or loading/empty state */}
          {isLoading ? (
            <ReviewsTableSkeleton />
          ) : reviews.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <Table
                columns={columns}
                data={reviews}
                rowKey="id"
                onRowClick={handleRowClick}
                hoverable
                size="default"
              />

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {reviews.length} reviews
                </p>
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}