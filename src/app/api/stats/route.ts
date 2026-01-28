import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { statsQuerySchema } from '@/lib/validators/stats'

interface ActivityDataPoint {
  date: string
  reviews: number
  comments: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const queryParams = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    }

    const validationResult = statsQuerySchema.safeParse(queryParams)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { startDate, endDate } = validationResult.data

    // Build date filter for activity data
    const dateFilter: Record<string, unknown> = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate)
    }

    // Fetch all statistics in parallel
    const [
      reviewStats,
      commentStats,
      activityData,
    ] = await Promise.all([
      // Review statistics by status
      prisma.review.groupBy({
        by: ['status'],
        _count: { id: true },
        where: Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : undefined,
      }),
      // Comment statistics
      Promise.all([
        // Total comments
        prisma.reviewComment.count({
          where: {
            parentId: null, // Only top-level comments
            ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
          },
        }),
        // Unresolved comments
        prisma.reviewComment.count({
          where: {
            parentId: null,
            isResolved: false,
            ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
          },
        }),
        // Comments by severity
        prisma.reviewComment.groupBy({
          by: ['severity'],
          _count: { id: true },
          where: {
            parentId: null,
            ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
          },
        }),
      ]),
      // Activity over time (daily breakdown)
      generateActivityData(startDate, endDate),
    ])

    // Process review stats
    const reviewsByStatus = {
      PENDING: 0,
      IN_PROGRESS: 0,
      APPROVED: 0,
      REJECTED: 0,
      CHANGES_REQUESTED: 0,
      CLOSED: 0,
    }

    reviewStats.forEach((stat: { status: string | null; _count: { id: number } }) => {
      if (stat.status && stat.status in reviewsByStatus) {
        reviewsByStatus[stat.status as keyof typeof reviewsByStatus] = stat._count.id
      }
    })

    const totalReviews = reviewStats.reduce((sum: number, stat: { _count: { id: number } }) => sum + stat._count.id, 0)

    // Process comment stats
    const severityCounts = {
      INFO: 0,
      SUGGESTION: 0,
      WARNING: 0,
      ERROR: 0,
      CRITICAL: 0,
    }

    const [totalComments, unresolvedCount, severityData] = commentStats

    severityData.forEach((stat: { severity: string | null; _count: { id: number } }) => {
      if (stat.severity && stat.severity in severityCounts) {
        severityCounts[stat.severity as keyof typeof severityCounts] = stat._count.id
      }
    })

    return NextResponse.json({
      reviews: {
        total: totalReviews,
        pending: reviewsByStatus.PENDING,
        inProgress: reviewsByStatus.IN_PROGRESS,
        approved: reviewsByStatus.APPROVED,
        changesRequested: reviewsByStatus.CHANGES_REQUESTED,
        closed: reviewsByStatus.CLOSED,
      },
      comments: {
        total: totalComments,
        unresolved: unresolvedCount,
        bySeverity: {
          info: severityCounts.INFO,
          suggestion: severityCounts.SUGGESTION,
          warning: severityCounts.WARNING,
          error: severityCounts.ERROR,
          critical: severityCounts.CRITICAL,
        },
      },
      activityOverTime: activityData,
    })
  } catch (error) {
    console.error('Get stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateActivityData(
  startDate?: string,
  endDate?: string
): Promise<ActivityDataPoint[]> {
  // Determine date range
  const end = endDate ? new Date(endDate) : new Date()
  const start = startDate
    ? new Date(startDate)
    : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000) // Default 30 days

  // Fetch all reviews and comments within the date range
  const [reviews, comments] = await Promise.all([
    prisma.review.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: { createdAt: true },
    }),
    prisma.reviewComment.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: { createdAt: true },
    }),
  ])

  // Create date-indexed maps
  const reviewsMap = new Map<string, number>()
  const commentsMap = new Map<string, number>()

  reviews.forEach((item: { createdAt: Date }) => {
    const dateKey = item.createdAt.toISOString().split('T')[0]
    reviewsMap.set(dateKey, (reviewsMap.get(dateKey) || 0) + 1)
  })

  comments.forEach((item: { createdAt: Date }) => {
    const dateKey = item.createdAt.toISOString().split('T')[0]
    commentsMap.set(dateKey, (commentsMap.get(dateKey) || 0) + 1)
  })

  // Generate daily data points
  const activityData: ActivityDataPoint[] = []
  const current = new Date(start)

  while (current <= end) {
    const dateKey = current.toISOString().split('T')[0]
    activityData.push({
      date: dateKey,
      reviews: reviewsMap.get(dateKey) || 0,
      comments: commentsMap.get(dateKey) || 0,
    })
    current.setDate(current.getDate() + 1)
  }

  return activityData
}