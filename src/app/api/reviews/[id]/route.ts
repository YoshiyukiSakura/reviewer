import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { UpdateReviewConfigRequest, ApiResponse, Review } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        comments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: review,
    } as ApiResponse<Review>);
  } catch (error) {
    console.error('Error fetching review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch review' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateReviewConfigRequest = await request.json();

    // Validate review exists
    const existingReview = await prisma.review.findUnique({
      where: { id },
    });

    if (!existingReview) {
      return NextResponse.json(
        { success: false, error: 'Review not found' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    // Update review
    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        status: body.status,
      },
      include: {
        comments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedReview,
    } as ApiResponse<Review>);
  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update review' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate review exists
    const existingReview = await prisma.review.findUnique({
      where: { id },
    });

    if (!existingReview) {
      return NextResponse.json(
        { success: false, error: 'Review not found' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    // Delete review (comments will be deleted via cascade)
    await prisma.review.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: null,
    } as ApiResponse<null>);
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete review' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
