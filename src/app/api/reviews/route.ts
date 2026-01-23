import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { ApiResponse, PaginatedResponse, Review } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const status = searchParams.get('status');
    const authorId = searchParams.get('authorId');

    // Build where clause
    const where: { status?: string; authorId?: string } = {};
    if (status) {
      where.status = status;
    }
    if (authorId) {
      where.authorId = authorId;
    }

    // Get total count
    const total = await prisma.review.count({ where });

    // Get paginated reviews
    const reviews = await prisma.review.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 5, // Only include first 5 comments in list view
        },
      },
    });

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      success: true,
      data: {
        items: reviews,
        total,
        page,
        pageSize,
        totalPages,
      },
    } as ApiResponse<PaginatedResponse<Review>>);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
