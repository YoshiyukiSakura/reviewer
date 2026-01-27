/**
 * Test Report Trigger Module
 *
 * Automatically triggers test report generation when an execution (review)
 * reaches a completed state (APPROVED, REJECTED, or CLOSED).
 */

import { prisma } from '../prisma';
import { log } from '../remote-log';
import { parseGitHubPRUrl } from '../github';
import { collectTestReportContext } from './collector';
import { createTestReportGeneratorFromEnv, type TestReportResult } from './generator';
import type { TestReport } from '@prisma/client';

/**
 * Completion statuses that trigger test report generation
 */
const COMPLETION_STATUSES = ['APPROVED', 'REJECTED', 'CLOSED'] as const;

/**
 * Parameters for triggering a test report
 */
export interface TriggerTestReportParams {
  /** The review/execution ID */
  reviewId: string;
  /** Optional title for the report */
  title?: string;
  /** Optional description for the report */
  description?: string;
}

/**
 * Result of triggering a test report
 */
export interface TriggerTestReportResult {
  /** Whether the trigger was successful */
  success: boolean;
  /** Test report ID if created/updated */
  reportId?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Checks if a review status is considered "completed"
 */
export function isReviewCompleted(status: string): boolean {
  return COMPLETION_STATUSES.includes(status as typeof COMPLETION_STATUSES[number]);
}

/**
 * Triggers test report generation for a completed execution
 *
 * This function is designed to be called asynchronously and will not
 * throw errors that could affect the main workflow.
 *
 * @param params - Parameters for triggering the test report
 * @returns TriggerTestReportResult indicating success or failure
 */
export async function triggerTestReport(
  params: TriggerTestReportParams
): Promise<TriggerTestReportResult> {
  const { reviewId, title, description } = params;

  try {
    // Check if review exists
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      log.warn('Review not found for test report trigger', { reviewId });
      return { success: false, error: 'Review not found' };
    }

    // Check if already completed
    if (!isReviewCompleted(review.status)) {
      log.debug('Review not in completed status, skipping test report trigger', {
        reviewId,
        status: review.status,
      });
      return { success: false, error: 'Review not completed' };
    }

    // Check if a test report already exists
    const existingReport = await prisma.testReport.findFirst({
      where: { executionId: reviewId },
    });

    if (existingReport) {
      log.debug('Test report already exists for review', {
        reviewId,
        reportId: existingReport.id,
      });
      return { success: true, reportId: existingReport.id };
    }

    // Collect context data
    const prParams = review.sourceUrl ? parseGitHubPRUrl(review.sourceUrl) : undefined;
    const contextResult = await collectTestReportContext({
      reviewId,
      prParams,
    });

    if (!contextResult.success) {
      log.error('Failed to collect test report context', {
        reviewId,
        error: contextResult.error,
      });
      return { success: false, error: contextResult.error };
    }

    // Generate AI report if needed
    let generatedResult: TestReportResult | null = null;
    try {
      const generator = createTestReportGeneratorFromEnv();
      const generateResult = await generator.generate({
        context: contextResult.data,
      });

      if (generateResult.success) {
        generatedResult = generateResult.data;
      } else {
        log.warn('AI report generation failed', {
          reviewId,
          error: generateResult.error,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.warn('AI report generation error', { reviewId, error: errorMessage });
      // Continue without AI-generated content
    }

    // Determine recommendation based on review status
    const recommendation = mapStatusToRecommendation(review.status);

    // Create the test report
    const reportData = {
      title: title || `${review.title} - Test Report`,
      description: description || review.description || null,
      recommendation,
      recommendationReason: generatedResult?.recommendationReason || null,
      summary: generatedResult?.summary || null,
      overallAnalysis: generatedResult?.overallAnalysis || null,
      score: generatedResult?.score || null,
      maxScore: generatedResult?.maxScore || 100,
      acceptanceSuggestion: generatedResult?.acceptanceSuggestion || null,
      keyFindings: generatedResult?.keyFindings || [],
      concerns: generatedResult?.concerns || [],
      positives: generatedResult?.positives || [],
      suggestions: generatedResult?.suggestions || null,
      repositoryName: contextResult.data.plan?.repositoryName || null,
      repositoryUrl: contextResult.data.plan?.repositoryUrl || null,
      branchName: contextResult.data.plan?.branchName || null,
      commitSha: contextResult.data.plan?.commitSha || null,
      pullRequestId: contextResult.data.plan?.pullRequestId || null,
      pullRequestUrl: contextResult.data.plan?.pullRequestUrl || null,
      totalTasks: contextResult.data.tasks.length,
      completedTasks: contextResult.data.tasks.filter((t) => t.status === 'completed').length,
      failedTasks: contextResult.data.tasks.filter((t) => t.status === 'failed').length,
      skippedTasks: contextResult.data.tasks.filter((t) => t.status === 'skipped').length,
      authorId: review.authorId,
      authorName: review.authorName,
      executedAt: contextResult.data.collectedAt,
    };

    const testReport = await prisma.testReport.create({
      data: {
        ...reportData,
        executionId: reviewId,
      },
    });

    log.info('Test report created via trigger', {
      reviewId,
      reportId: testReport.id,
      recommendation,
    });

    return { success: true, reportId: testReport.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Failed to trigger test report', { reviewId, error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

/**
 * Maps review status to recommendation type
 */
function mapStatusToRecommendation(status: string): 'MERGE' | 'NEEDS_CHANGES' | 'REJECT' {
  switch (status) {
    case 'APPROVED':
      return 'MERGE';
    case 'REJECTED':
      return 'REJECT';
    case 'CHANGES_REQUESTED':
    case 'CLOSED':
    default:
      return 'NEEDS_CHANGES';
  }
}

/**
 * Convenience function to trigger test report generation
 * Wraps triggerTestReport with fire-and-forget semantics
 *
 * @param params - Parameters for triggering the test report
 * @returns void (errors are logged but not thrown)
 */
export function triggerTestReportAsync(params: TriggerTestReportParams): void {
  triggerTestReport(params).catch((error) => {
    log.error('Unexpected error in triggerTestReportAsync', {
      reviewId: params.reviewId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  });
}