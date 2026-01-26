'use client'

import React from 'react'
import { useDashboardStats, useActivityStats, useReviews } from '@/lib/react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/lib/ui'
import { StatsChart } from '@/lib/ui'
import { Badge } from '@/lib/ui'
import { ErrorBoundary } from '@/lib/ui'
import { BarChart3, FileText, Clock, CheckCircle, MessageCircle } from 'lucide-react'
import type { Review, DashboardStats } from '@/types'

/**
 * Stat card component for displaying a single statistic
 */
interface StatCardProps {
  label: string
  value: number
  description?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  icon?: React.ReactNode
  color?: string
}

function StatCard({ label, value, description, trend, trendValue, icon, color = '#3b82f6' }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold tracking-tight">{value.toLocaleString()}</p>
              {trend && trendValue && (
                <span className={`text-sm font-medium ${
                  trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
                }`}>
                  {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}{trendValue}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            {icon || <BarChart3 className="h-6 w-6" style={{ color }} />}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton for stat cards
 */
function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-24" />
          <div className="h-8 bg-muted rounded w-16" />
          <div className="h-3 bg-muted rounded w-32" />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Recent activity item component
 */
interface ActivityItemProps {
  review: Review
}

function ActivityItem({ review }: ActivityItemProps) {
  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-500',
    IN_PROGRESS: 'bg-blue-500',
    APPROVED: 'bg-green-500',
    CHANGES_REQUESTED: 'bg-purple-500',
    CLOSED: 'bg-red-500',
  }

  const statusLabels: Record<string, string> = {
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    APPROVED: 'Approved',
    CHANGES_REQUESTED: 'Changes Requested',
    CLOSED: 'Closed',
  }

  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
      <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${statusColors[review.status] || 'bg-gray-500'}`} />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-medium truncate">{review.title}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{review.authorName || 'Anonymous'}</span>
          <span>·</span>
          <span>{formatDate(review.createdAt)}</span>
        </div>
      </div>
      <Badge variant="secondary" className="flex-shrink-0">
        {statusLabels[review.status]}
      </Badge>
    </div>
  )
}

/**
 * Recent activity list component
 */
interface RecentActivityProps {
  reviews: Review[]
  isLoading: boolean
}

function RecentActivity({ reviews, isLoading }: RecentActivityProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest review activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-start gap-4 p-4">
                <div className="w-2 h-2 mt-2 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest review activities</CardDescription>
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-1">
            {reviews.slice(0, 10).map((review) => (
              <ActivityItem key={review.id} review={review} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Overview charts section
 */
interface OverviewChartsProps {
  stats: DashboardStats | null
  isLoading: boolean
}

function OverviewCharts({ stats, isLoading }: OverviewChartsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-32 mb-4" />
              <div className="h-48 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-32 mb-4" />
              <div className="h-48 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <StatsChart
        stats={stats}
        chartType="reviews"
        title="Reviews Overview"
        description="Distribution of review statuses"
        chartHeight={220}
      />
      <StatsChart
        stats={stats}
        chartType="comments"
        title="Comments Overview"
        description="Comments by severity level"
        chartHeight={220}
      />
    </div>
  )
}

/**
 * Activity chart section
 */
interface ActivityChartProps {
  activityData: Array<{ date: string; reviews: number; comments: number }>
  isLoading: boolean
}

function ActivityChart({ activityData, isLoading }: ActivityChartProps) {
  // Create a mock stats object for activity chart
  const mockStats: DashboardStats = {
    reviews: { total: 0, pending: 0, inProgress: 0, approved: 0, changesRequested: 0, closed: 0 },
    comments: { total: 0, unresolved: 0, bySeverity: { info: 0, suggestion: 0, warning: 0, critical: 0 } },
    activityOverTime: activityData,
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Trends</CardTitle>
          <CardDescription>Reviews and comments over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-64 bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  return (
    <StatsChart
      stats={mockStats}
      chartType="activity"
      title="Activity Trends"
      description="Reviews and comments over time"
      chartHeight={280}
    />
  )
}

/**
 * Dashboard page component
 */
export default function DashboardPage() {
  const { stats: dashboardStats, isLoading: statsLoading, refetch: refetchStats } = useDashboardStats()
  const { data: activityData, isLoading: activityLoading, refetch: refetchActivity } = useActivityStats({ interval: 'day' })
  const { reviews, isLoading: reviewsLoading, refetch: refetchReviews } = useReviews({ filters: { pageSize: 10 }, select: (data) => ({ ...data, items: data.items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) }) })

  const isLoading = statsLoading || activityLoading

  // Calculate summary stats
  const totalReviews = dashboardStats?.reviews.total ?? 0
  const pendingReviews = dashboardStats?.reviews.pending ?? 0
  const approvedReviews = dashboardStats?.reviews.approved ?? 0
  const totalComments = dashboardStats?.comments.total ?? 0
  const unresolvedComments = dashboardStats?.comments.unresolved ?? 0

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          System overview and statistics
        </p>
      </div>

      <ErrorBoundary>
        {/* Summary stat cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {isLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                label="Total Reviews"
                value={totalReviews}
                description="All time reviews"
                icon={<FileText className="h-6 w-6" />}
                color="#3b82f6"
              />
              <StatCard
                label="Pending Reviews"
                value={pendingReviews}
                description="Awaiting review"
                icon={<Clock className="h-6 w-6" />}
                color="#f59e0b"
              />
              <StatCard
                label="Approved"
                value={approvedReviews}
                description="Successfully approved"
                icon={<CheckCircle className="h-6 w-6" />}
                color="#22c55e"
              />
              <StatCard
                label="Unresolved Comments"
                value={unresolvedComments}
                description="Need attention"
                icon={<MessageCircle className="h-6 w-6" />}
                color="#ef4444"
              />
            </>
          )}
        </div>

        {/* Overview charts */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold tracking-tight mb-4">Overview</h2>
          <OverviewCharts stats={dashboardStats} isLoading={statsLoading} />
        </div>

        {/* Activity chart and recent activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ActivityChart activityData={activityData} isLoading={activityLoading} />
          </div>
          <div>
            <RecentActivity reviews={reviews} isLoading={reviewsLoading} />
          </div>
        </div>
      </ErrorBoundary>
    </div>
  )
}