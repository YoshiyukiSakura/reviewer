import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPRDiff, type PullRequestDiff } from '@/lib/github/pr-diff'
import type { ApiResponse } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<PullRequestDiff>>> {
  try {
    const { id } = await params

    // First, get the review to extract PR information
    const review = await prisma.review.findUnique({
      where: { id },
      select: {
        sourceType: true,
        sourceId: true,
        sourceUrl: true,
      },
    })

    if (!review) {
      return NextResponse.json(
        {
          success: false,
          error: 'Review not found',
        },
        { status: 404 }
      )
    }

    // Only fetch diff if the review is from a pull request
    if (review.sourceType !== 'pull_request' || !review.sourceUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Review is not associated with a pull request',
        },
        { status: 400 }
      )
    }

    // Parse GitHub PR URL to extract owner, repo, and PR number
    // Expected format: https://github.com/owner/repo/pull/123
    const urlMatch = review.sourceUrl.match(
      /github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/
    )

    if (!urlMatch) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid GitHub PR URL format',
        },
        { status: 400 }
      )
    }

    const [, owner, repo, prNumberStr] = urlMatch
    const pullNumber = parseInt(prNumberStr, 10)

    // Fetch the PR diff from GitHub
    const result = await getPRDiff({ owner, repo, pullNumber })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (error) {
    console.error('Error fetching review diff:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
