import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { RetriggerReviewRequest, ApiResponse } from '@/types';
import { ReviewProcessor } from '@/worker/review-processor';
import {
  createOpenAIReviewer,
  createAnthropicReviewer,
  createAzureOpenAIReviewer,
  createReviewerFromEnv,
} from '@/lib/ai/reviewer';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: RetriggerReviewRequest = await request.json();

    // Fetch the existing review
    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    // Validate that the review has source information
    if (
      !review.sourceType ||
      review.sourceType !== 'pull_request' ||
      !review.sourceId ||
      !review.sourceUrl
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Review does not have valid source information for re-triggering',
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Parse the source URL to get owner, repo, and pull number
    // Expected format: https://github.com/{owner}/{repo}/pull/{number}
    const urlMatch = review.sourceUrl.match(
      /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/
    );

    if (!urlMatch) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid GitHub PR URL format',
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const [, owner, repo, pullNumberStr] = urlMatch;
    const pullNumber = parseInt(pullNumberStr, 10);

    // Create AI reviewer based on configuration
    let aiReviewer;
    if (body.config) {
      const { aiProvider, aiModel } = body.config;

      // Get API key from environment based on provider
      let apiKey = '';
      let baseUrl: string | undefined;

      switch (aiProvider) {
        case 'openai':
          apiKey = process.env.OPENAI_API_KEY || '';
          aiReviewer = createOpenAIReviewer(apiKey, aiModel);
          break;
        case 'anthropic':
          apiKey = process.env.ANTHROPIC_API_KEY || '';
          aiReviewer = createAnthropicReviewer(apiKey, aiModel);
          break;
        case 'azure-openai':
          apiKey = process.env.AZURE_OPENAI_API_KEY || '';
          baseUrl = process.env.AI_BASE_URL;
          if (!baseUrl) {
            return NextResponse.json(
              {
                success: false,
                error: 'AI_BASE_URL is required for Azure OpenAI',
              } as ApiResponse<null>,
              { status: 400 }
            );
          }
          aiReviewer = createAzureOpenAIReviewer(apiKey, baseUrl, aiModel);
          break;
      }

      if (!apiKey) {
        return NextResponse.json(
          {
            success: false,
            error: `API key not configured for ${aiProvider}`,
          } as ApiResponse<null>,
          { status: 400 }
        );
      }
    } else {
      aiReviewer = createReviewerFromEnv();
    }

    // Update review status to IN_PROGRESS
    await prisma.review.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    });

    // Create processor with the configured reviewer
    const processor = new ReviewProcessor({ aiReviewer });

    // Process the PR
    const result = await processor.processPR({
      owner,
      repo,
      pullNumber,
      prTitle: review.title,
      prDescription: review.description || undefined,
      authorId: review.authorId,
      authorName: review.authorName || undefined,
    });

    if (!result.success) {
      // Update review status to CLOSED on failure
      await prisma.review.update({
        where: { id },
        data: { status: 'CLOSED' },
      });

      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to re-trigger review',
        } as ApiResponse<null>,
        { status: 500 }
      );
    }

    // Fetch the updated review with comments
    const updatedReview = await prisma.review.findUnique({
      where: { id: result.reviewId || id },
      include: {
        comments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        review: updatedReview,
        aiResult: result.aiResult,
        durationMs: result.durationMs,
      },
    });
  } catch (error) {
    console.error('Error re-triggering review:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to re-trigger review',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
