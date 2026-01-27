import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createCommentSchema, commentQuerySchema } from '@/lib/validators/comments'
import { verifyToken, type TokenPayload } from '@/lib/auth'

async function getTokenPayload(request: Request): Promise<TokenPayload | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.split(' ')[1]
  const result = await verifyToken(token)
  return result.valid ? result.payload : null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const queryParams = {
      page: searchParams.get('page') || '1',
      pageSize: searchParams.get('pageSize') || '20',
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
      reviewId: searchParams.get('reviewId') || undefined,
      isResolved: searchParams.get('isResolved') || undefined,
      severity: searchParams.get('severity') || undefined,
      authorId: searchParams.get('authorId') || undefined,
    }

    const validationResult = commentQuerySchema.safeParse(queryParams)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { page, pageSize, sortBy, sortOrder, reviewId, isResolved, severity, authorId } = validationResult.data

    const where: Record<string, unknown> = {}

    if (reviewId) {
      where.reviewId = reviewId
    }

    if (isResolved !== undefined) {
      where.isResolved = isResolved
    }

    if (severity) {
      where.severity = severity
    }

    if (authorId) {
      where.authorId = authorId
    }

    // Only fetch top-level comments (no parent) for list view
    where.parentId = null

    const [comments, total] = await Promise.all([
      prisma.reviewComment.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: { replies: true },
          },
        },
      }),
      prisma.reviewComment.count({ where }),
    ])

    return NextResponse.json({
      items: comments,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Get comments error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const payload = await getTokenPayload(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const validationResult = createCommentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { content, reviewId, filePath, lineStart, lineEnd, severity, parentId, authorName } = validationResult.data

    // Verify review exists
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    })

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    // If parentId is provided, verify parent comment exists
    if (parentId) {
      const parentComment = await prisma.reviewComment.findUnique({
        where: { id: parentId },
      })

      if (!parentComment) {
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 404 }
        )
      }

      // Parent must belong to the same review
      if (parentComment.reviewId !== reviewId) {
        return NextResponse.json(
          { error: 'Parent comment does not belong to the specified review' },
          { status: 400 }
        )
      }
    }

    const comment = await prisma.reviewComment.create({
      data: {
        content,
        reviewId,
        filePath,
        lineStart,
        lineEnd,
        severity,
        parentId,
        authorId: payload.userId,
        authorName,
      },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Create comment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}