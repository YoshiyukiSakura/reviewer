import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ApiResponse, Review } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Review>>> {
  try {
    const { id } = await params

    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        comments: {
          include: {
            replies: {
              include: {
                replies: true, // Support nested replies (2 levels deep)
              },
            },
          },
          where: {
            parentId: null, // Only get top-level comments
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
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

    // Convert dates to proper Date objects and handle null values
    const serializedReview: Review = {
      ...review,
      description: review.description ?? undefined,
      sourceType: review.sourceType as 'pull_request' | 'commit' | 'file' | undefined,
      sourceId: review.sourceId ?? undefined,
      sourceUrl: review.sourceUrl ?? undefined,
      authorName: review.authorName ?? undefined,
      createdAt: new Date(review.createdAt),
      updatedAt: new Date(review.updatedAt),
      comments: review.comments.map((comment) => ({
        ...comment,
        filePath: comment.filePath ?? undefined,
        lineStart: comment.lineStart ?? undefined,
        lineEnd: comment.lineEnd ?? undefined,
        severity: comment.severity ?? undefined,
        authorName: comment.authorName ?? undefined,
        parentId: comment.parentId ?? undefined,
        createdAt: new Date(comment.createdAt),
        updatedAt: new Date(comment.updatedAt),
        replies: comment.replies?.map((reply) => ({
          ...reply,
          filePath: reply.filePath ?? undefined,
          lineStart: reply.lineStart ?? undefined,
          lineEnd: reply.lineEnd ?? undefined,
          severity: reply.severity ?? undefined,
          authorName: reply.authorName ?? undefined,
          parentId: reply.parentId ?? undefined,
          createdAt: new Date(reply.createdAt),
          updatedAt: new Date(reply.updatedAt),
          replies: reply.replies?.map((nestedReply) => ({
            ...nestedReply,
            filePath: nestedReply.filePath ?? undefined,
            lineStart: nestedReply.lineStart ?? undefined,
            lineEnd: nestedReply.lineEnd ?? undefined,
            severity: nestedReply.severity ?? undefined,
            authorName: nestedReply.authorName ?? undefined,
            parentId: nestedReply.parentId ?? undefined,
            createdAt: new Date(nestedReply.createdAt),
            updatedAt: new Date(nestedReply.updatedAt),
          })),
        })),
      })),
    }

    return NextResponse.json({
      success: true,
      data: serializedReview,
    })
  } catch (error) {
    console.error('Error fetching review:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
