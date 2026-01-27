'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useTestReports } from '@/lib/react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/lib/ui'
import { Table, type Column } from '@/lib/ui/table'
import { Button } from '@/lib/ui/button'
import { Input } from '@/lib/ui/input'
import { RecommendationBadge } from '@/lib/ui/recommendation-badge'
import { ScoreGauge } from '@/lib/ui/score-gauge'
import type { TestReport, TestReportRecommendation, PaginatedResponse } from '@/types'

/**
 * Recommendation type configuration
 */
const recommendationConfig: Record<TestReportRecommendation, { label: string }> = {
  MERGE: { label: 'Merge' },
  NEEDS_CHANGES: { label: 'Needs Changes' },
  REJECT: { label: 'Reject' },
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
  { value: 'score', label: 'Score' },
]

/**
 * Filter bar component with search, recommendation filter, and sort controls
 */
interface FilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  recommendationFilter: TestReportRecommendation | ''
  onRecommendationFilterChange: (value: TestReportRecommendation | '') => void
  sortBy: string
  onSortByChange: (value: string) => void
  sortOrder: 'asc' | 'desc'
  onSortOrderChange: (value: 'asc' | 'desc') => void
}

function FilterBar({
  search,
  onSearchChange,
  recommendationFilter,
  onRecommendationFilterChange,
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
          placeholder="Search by title or repository..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          leftAddon="🔍"
        />
      </div>

      {/* Recommendation filter */}
      <div className="w-full sm:w-48">
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          value={recommendationFilter}
          onChange={(e) => onRecommendationFilterChange(e.target.value as TestReportRecommendation | '')}
        >
          <option value="">All Recommendations</option>
          {Object.entries(recommendationConfig).map(([value, config]) => (
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
  if (totalPages <= 1) return null

  const pages = useMemo(() => {
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
 * Reports table skeleton loading state
 */
function ReportsTableSkeleton() {
  return (
    <div className="w-full overflow-hidden rounded-md border">
      <table className="w-full caption-bottom text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Title</th>
            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Recommendation</th>
            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Score</th>
            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Repository</th>
            <th className="h-10 px-4 text-left font-medium text-muted-foreground">Created</th>
          </tr>
        </thead>
        <tbody className="bg-background">
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="border-t">
              <td className="p-4"><div className="h-4 w-full animate-pulse rounded bg-muted" /></td>
              <td className="p-4"><div className="h-6 w-20 animate-pulse rounded bg-muted" /></td>
              <td className="p-4"><div className="h-10 w-10 animate-pulse rounded-full bg-muted" /></td>
              <td className="p-4"><div className="h-4 w-32 animate-pulse rounded bg-muted" /></td>
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
        <span className="text-3xl">📊</span>
      </div>
      <h3 className="text-lg font-semibold mb-2">No test reports found</h3>
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
 * Reports list page component
 */
export default function ReportsListPage() {
  // Filter state
  const [search, setSearch] = useState('')
  const [recommendationFilter, setRecommendationFilter] = useState<TestReportRecommendation | ''>('')
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

  // Apply filters
  const filters = useMemo(
    () => ({
      page,
      pageSize,
      search: debouncedSearch || undefined,
      recommendation: recommendationFilter || undefined,
      sortBy,
      sortOrder,
    }),
    [page, pageSize, debouncedSearch, recommendationFilter, sortBy, sortOrder]
  )

  // Fetch reports
  const {
    testReports,
    isLoading,
    error,
    refetch,
  } = useTestReports({
    filters,
    select: (data: PaginatedResponse<TestReport>) => data,
  })

  const totalPages = useMemo(() => {
    // Calculate total pages based on data
    if (testReports.length === 0) return 1
    // This would be calculated from the API response in a real implementation
    return Math.max(page, Math.ceil(testReports.length / pageSize) + (testReports.length === pageSize ? 1 : 0)) || 1
  }, [testReports.length, pageSize])

  // Table columns configuration
  const columns: Column<TestReport>[] = useMemo(
    () => [
      {
        key: 'title',
        title: 'Title',
        render: (report) => (
          <div className="max-w-md">
            <p className="font-medium truncate">{report.title}</p>
            {report.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {report.description}
              </p>
            )}
          </div>
        ),
      },
      {
        key: 'recommendation',
        title: 'Recommendation',
        render: (report) => (
          <RecommendationBadge type={report.recommendation} size="sm" />
        ),
        width: '140px',
      },
      {
        key: 'score',
        title: 'Score',
        render: (report) =>
          report.score !== undefined ? (
            <ScoreGauge score={report.score} size="sm" showScore={false} />
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
        width: '80px',
      },
      {
        key: 'repositoryName',
        title: 'Repository',
        render: (report) => (
          <span className="text-muted-foreground">
            {report.repositoryName || 'Unknown'}
          </span>
        ),
        width: '150px',
      },
      {
        key: 'authorName',
        title: 'Plan',
        render: (report) => report.authorName || 'Anonymous',
        width: '120px',
      },
      {
        key: 'createdAt',
        title: 'Created',
        render: (report) => (
          <span className="text-muted-foreground text-sm">
            {formatDate(report.createdAt)}
          </span>
        ),
        width: '150px',
      },
    ],
    []
  )

  const handleRowClick = (report: TestReport) => {
    window.location.href = `/reports/${report.id}`
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Test Reports</h1>
        <p className="text-muted-foreground mt-2">
          View and analyze test report results
        </p>
      </div>

      {/* Error state */}
      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <span className="text-destructive">Error loading reports</span>
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
          <CardTitle>All Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filter bar */}
          <FilterBar
            search={search}
            onSearchChange={(value) => setSearch(value)}
            recommendationFilter={recommendationFilter}
            onRecommendationFilterChange={(value) => setRecommendationFilter(value)}
            sortBy={sortBy}
            onSortByChange={(value) => setSortBy(value)}
            sortOrder={sortOrder}
            onSortOrderChange={(value) => setSortOrder(value)}
          />

          {/* Table or loading/empty state */}
          {isLoading ? (
            <ReportsTableSkeleton />
          ) : testReports.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <Table
                columns={columns}
                data={testReports}
                rowKey="id"
                onRowClick={handleRowClick}
                hoverable
                size="default"
              />

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {testReports.length} reports
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