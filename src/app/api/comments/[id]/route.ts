import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateCommentSchema } from '@/lib/validators/comments'
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const comment = await prisma.reviewComment.findUnique({
      where: { id },
      include: {
        review: {
          select: { id: true, title: true },
        },
        parent: {
          select: { id: true, content: true, authorName: true, createdAt: true },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { replies: true },
        },
      },
    })

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(comment)
  } catch (error) {
    console.error('Get comment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getTokenPayload(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const validationResult = updateCommentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const existingComment = await prisma.reviewComment.findUnique({
      where: { id },
    })

    if (!existingComment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    const { content, isResolved, severity } = validationResult.data

    const comment = await prisma.reviewComment.update({
      where: { id },
      data: {
        ...(content !== undefined && { content }),
        ...(isResolved !== undefined && { isResolved }),
        ...(severity !== undefined && { severity }),
      },
    })

    return NextResponse.json(comment)
  } catch (error) {
    console.error('Update comment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getTokenPayload(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existingComment = await prisma.reviewComment.findUnique({
      where: { id },
    })

    if (!existingComment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    await prisma.reviewComment.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Comment deleted successfully' })
  } catch (error) {
    console.error('Delete comment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}