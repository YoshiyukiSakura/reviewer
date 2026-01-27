import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createReviewSchema, reviewQuerySchema } from '@/lib/validators/reviews'
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
      status: searchParams.get('status') || undefined,
      authorId: searchParams.get('authorId') || undefined,
      search: searchParams.get('search') || undefined,
    }

    const validationResult = reviewQuerySchema.safeParse(queryParams)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { page, pageSize, sortBy, sortOrder, status, authorId, search } = validationResult.data

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (authorId) {
      where.authorId = authorId
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          comments: {
            select: { id: true },
          },
        },
      }),
      prisma.review.count({ where }),
    ])

    return NextResponse.json({
      items: reviews,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Get reviews error:', error)
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

    const validationResult = createReviewSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { title, description, sourceType, sourceId, sourceUrl, authorName } = validationResult.data

    const review = await prisma.review.create({
      data: {
        title,
        description,
        sourceType,
        sourceId,
        sourceUrl,
        authorId: payload.userId,
        authorName,
      },
    })

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    console.error('Create review error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}