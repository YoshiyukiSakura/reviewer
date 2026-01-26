'use client'

import { type HTMLAttributes } from 'react'
import { type ReviewStats, type CommentStats, type DashboardStats } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './card'

export interface StatsChartProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Dashboard statistics data
   */
  stats: DashboardStats
  /**
   * Chart type to display
   * @default 'overview'
   */
  chartType?: 'overview' | 'reviews' | 'comments' | 'activity'
  /**
   * Title for the card
   * @default 'Statistics'
   */
  title?: string
  /**
   * Description for the card
   */
  description?: string
  /**
   * Whether to show the card wrapper
   * @default true
   */
  useCard?: boolean
  /**
   * Height of the chart
   * @default 200
   */
  chartHeight?: number
}

/**
 * Get color for review status
 */
function getReviewStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: '#f59e0b',
    inProgress: '#3b82f6',
    approved: '#22c55e',
    changesRequested: '#8b5cf6',
    closed: '#ef4444',
  }
  return colors[status] || '#6b7280'
}

/**
 * Get color for comment severity
 */
function getCommentSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    info: '#3b82f6',
    suggestion: '#8b5cf6',
    warning: '#f59e0b',
    critical: '#ef4444',
  }
  return colors[severity] || '#6b7280'
}

/**
 * Donut chart component
 */
interface DonutChartProps {
  data: { label: string; value: number; color: string }[]
  height?: number
  showLabels?: boolean
}

function DonutChart({ data, height = 200, showLabels = true }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  if (total === 0) return null

  const radius = height / 2 - 20
  const circumference = 2 * Math.PI * radius
  let currentAngle = -Math.PI / 2 // Start from top

  const segments = data.map((item) => {
    const percentage = item.value / total
    const angle = percentage * 2 * Math.PI
    const startAngle = currentAngle
    currentAngle += angle

    return {
      ...item,
      percentage,
      startAngle,
      endAngle: currentAngle,
      dashArray: `${angle * circumference} ${circumference}`,
    }
  })

  return (
    <div className="flex items-center gap-6">
      <svg height={height} width={height} className="flex-shrink-0">
        <circle
          cx={height / 2}
          cy={height / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="24"
          className="text-muted dark:text-gray-700"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={0}
        />
        {segments.map((segment, i) => (
          <circle
            key={i}
            cx={height / 2}
            cy={height / 2}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth="24"
            strokeDasharray={segment.dashArray}
            strokeDashoffset={`-${segment.startAngle * radius}`}
            className="transition-all duration-300 hover:opacity-80"
          >
            <title>{`${segment.label}: ${segment.value}`}</title>
          </circle>
        ))}
        <circle
          cx={height / 2}
          cy={height / 2}
          r={height / 2 - 28}
          fill="currentColor"
          className="text-background dark:text-gray-900"
        />
        <text
          x={height / 2}
          y={height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-2xl font-bold fill-foreground"
        >
          {total}
        </text>
        <text
          x={height / 2}
          y={height / 2 + 20}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs fill-muted-foreground"
        >
          Total
        </text>
      </svg>

      {showLabels && (
        <div className="flex flex-col gap-2 min-w-[120px]">
          {segments.map((segment, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-sm truncate">{segment.label}</span>
              <span className="text-sm text-muted-foreground ml-auto">
                {segment.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Bar chart component for activity over time
 */
interface BarChartProps {
  data: Array<{ date: string; reviews: number; comments: number }>
  height?: number
}

function BarChart({ data, height = 200 }: BarChartProps) {
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.reviews, d.comments)),
    1
  )
  const barWidth = Math.min(40, (data.length > 1 ? 600 / data.length : 40) - 4)
  const gap = data.length > 1 ? Math.min(4, 600 / data.length - barWidth) : 2

  const chartHeight = height - 40 // Leave space for labels

  return (
    <div className="w-full">
      <div className="relative" style={{ height }}>
        {/* Y-axis grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          <div className="border-b border-dashed border-muted-foreground/20 h-px w-full" />
          <div className="border-b border-dashed border-muted-foreground/20 h-px w-full" />
          <div className="border-b border-dashed border-muted-foreground/20 h-px w-full" />
          <div className="border-b border-dashed border-muted-foreground/20 h-px w-full" />
        </div>

        {/* Bars */}
        <div className="absolute inset-0 flex items-end justify-between px-2 pb-6">
          {data.map((item, i) => (
            <div key={i} className="flex gap-1">
              <div
                className="w-4 bg-primary rounded-t transition-all hover:opacity-80"
                style={{
                  height: `${(item.reviews / maxValue) * chartHeight}px`,
                  width: barWidth / 2 - 1,
                }}
              >
                <title>{`Reviews: ${item.reviews}`}</title>
              </div>
              <div
                className="w-4 bg-secondary rounded-t transition-all hover:opacity-80"
                style={{
                  height: `${(item.comments / maxValue) * chartHeight}px`,
                  width: barWidth / 2 - 1,
                }}
              >
                <title>{`Comments: ${item.comments}`}</title>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary" />
            <span className="text-xs text-muted-foreground">Reviews</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-secondary" />
            <span className="text-xs text-muted-foreground">Comments</span>
          </div>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between px-2 mt-2">
        {data.map((item, i) => {
          const date = new Date(item.date)
          const label = `${date.getMonth() + 1}/${date.getDate()}`
          const shouldShow = data.length <= 7 || i % Math.ceil(data.length / 7) === 0
          return (
            <span
              key={i}
              className="text-xs text-muted-foreground"
              style={{ visibility: shouldShow ? 'visible' : 'hidden' }}
            >
              {label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Stat card component for displaying a single statistic
 */
interface StatCardProps {
  label: string
  value: number
  color: string
  icon?: React.ReactNode
}

function StatCard({ label, value, color, icon }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}20` }}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  )
}

/**
 * Stats chart component for displaying review and comment statistics
 *
 * @example
 * ```tsx
 * // Overview chart with donut
 * <StatsChart stats={statsData} chartType="overview" />
 *
 * // Activity bar chart
 * <StatsChart stats={statsData} chartType="activity" chartHeight={250} />
 *
 * // Reviews breakdown
 * <StatsChart stats={statsData} chartType="reviews" />
 *
 * // Without card wrapper
 * <StatsChart stats={statsData} useCard={false} />
 * ```
 */
export function StatsChart({
  className = '',
  stats,
  chartType = 'overview',
  title = 'Statistics',
  description,
  useCard = true,
  chartHeight = 200,
  ...props
}: StatsChartProps) {
  const reviewData = [
    { label: 'Pending', value: stats.reviews.pending, color: getReviewStatusColor('pending') },
    { label: 'In Progress', value: stats.reviews.inProgress, color: getReviewStatusColor('inProgress') },
    { label: 'Approved', value: stats.reviews.approved, color: getReviewStatusColor('approved') },
    { label: 'Changes Requested', value: stats.reviews.changesRequested, color: getReviewStatusColor('changesRequested') },
    { label: 'Closed', value: stats.reviews.closed, color: getReviewStatusColor('closed') },
  ].filter((d) => d.value > 0)

  const commentData = [
    { label: 'Info', value: stats.comments.bySeverity.info, color: getCommentSeverityColor('info') },
    { label: 'Suggestion', value: stats.comments.bySeverity.suggestion, color: getCommentSeverityColor('suggestion') },
    { label: 'Warning', value: stats.comments.bySeverity.warning, color: getCommentSeverityColor('warning') },
    { label: 'Critical', value: stats.comments.bySeverity.critical, color: getCommentSeverityColor('critical') },
  ].filter((d) => d.value > 0)

  const content = (
    <>
      {chartType === 'overview' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium mb-4">Reviews by Status</h4>
            <DonutChart data={reviewData} height={chartHeight} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Comments by Severity</h4>
            <DonutChart data={commentData} height={chartHeight} />
          </div>
        </div>
      )}

      {chartType === 'reviews' && (
        <div>
          <h4 className="text-sm font-medium mb-4">Review Status Distribution</h4>
          <DonutChart data={reviewData} height={chartHeight} showLabels={false} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
            <StatCard
              label="Total Reviews"
              value={stats.reviews.total}
              color="#3b82f6"
              icon={<span className="text-lg">📋</span>}
            />
            <StatCard
              label="Pending"
              value={stats.reviews.pending}
              color="#f59e0b"
            />
            <StatCard
              label="Approved"
              value={stats.reviews.approved}
              color="#22c55e"
            />
          </div>
        </div>
      )}

      {chartType === 'comments' && (
        <div>
          <h4 className="text-sm font-medium mb-4">Comment Severity Distribution</h4>
          <DonutChart data={commentData} height={chartHeight} showLabels={false} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
            <StatCard
              label="Total Comments"
              value={stats.comments.total}
              color="#3b82f6"
            />
            <StatCard
              label="Unresolved"
              value={stats.comments.unresolved}
              color="#f59e0b"
            />
            <StatCard
              label="Critical"
              value={stats.comments.bySeverity.critical}
              color="#ef4444"
            />
          </div>
        </div>
      )}

      {chartType === 'activity' && (
        <div>
          <h4 className="text-sm font-medium mb-4">Activity Over Time</h4>
          <BarChart data={stats.activityOverTime} height={chartHeight} />
        </div>
      )}
    </>
  )

  if (useCard) {
    return (
      <Card className={className} {...props}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    )
  }

  return (
    <div className={className} {...props}>
      {content}
    </div>
  )
}

export default StatsChart