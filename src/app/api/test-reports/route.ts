import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { testReportQuerySchema, createTestReportSchema } from '@/lib/validators/test-reports';
import { verifyToken, type TokenPayload } from '@/lib/auth';
import { collectTestReportContext } from '@/lib/test-report/collector';
import { createTestReportGeneratorFromEnv, type TestReportResult } from '@/lib/test-report/generator';
import { log } from '@/lib/remote-log';
import type { GetPRDiffParams } from '@/lib/github/pr-diff';

async function getTokenPayload(request: Request): Promise<TokenPayload | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  const result = await verifyToken(token);
  return result.valid ? result.payload : null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = {
      page: searchParams.get('page') || '1',
      pageSize: searchParams.get('pageSize') || '20',
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
      recommendation: searchParams.get('recommendation') || undefined,
      authorId: searchParams.get('authorId') || undefined,
      executionId: searchParams.get('executionId') || undefined,
      search: searchParams.get('search') || undefined,
      fromDate: searchParams.get('fromDate') || undefined,
      toDate: searchParams.get('toDate') || undefined,
    };

    const validationResult = testReportQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const {
      page,
      pageSize,
      sortBy,
      sortOrder,
      recommendation,
      authorId,
      executionId,
      search,
      fromDate,
      toDate,
    } = validationResult.data;

    const where: Record<string, unknown> = {};

    if (recommendation) {
      where.recommendation = recommendation;
    }

    if (authorId) {
      where.authorId = authorId;
    }

    if (executionId) {
      where.executionId = executionId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { overallAnalysis: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (fromDate || toDate) {
      where.executedAt = {};
      if (fromDate) {
        (where.executedAt as Record<string, Date>).gte = fromDate;
      }
      if (toDate) {
        (where.executedAt as Record<string, Date>).lte = toDate;
      }
    }

    const [testReports, total] = await Promise.all([
      prisma.testReport.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.testReport.count({ where }),
    ]);

    return NextResponse.json({
      items: testReports,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    log.error('Get test reports error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await getTokenPayload(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const validationResult = createTestReportSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { executionId, title, description, recommendation, recommendationReason, summary, overallAnalysis, score, maxScore, acceptanceSuggestion, testDuration, testRunner } = validationResult.data;

    // Verify the execution/review exists
    const execution = await prisma.review.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Check if a test report already exists for this execution
    const existingReport = await prisma.testReport.findFirst({
      where: { executionId },
    });

    let prParams: GetPRDiffParams | undefined;
    if (execution.sourceUrl) {
      try {
        const url = new URL(execution.sourceUrl);
        const pathParts = url.pathname.split('/').filter(Boolean);
        if (pathParts.length >= 2 && url.pathname.includes('/pull/')) {
          const owner = pathParts[0];
          const repo = pathParts[1];
          const prMatch = url.pathname.match(/pull\/(\d+)/);
          if (prMatch) {
            prParams = {
              owner,
              repo,
              pullNumber: parseInt(prMatch[1], 10),
            };
          }
        }
      } catch {
        // Invalid URL, skip PR diff collection
      }
    }

    // Collect context data
    const contextResult = await collectTestReportContext({
      reviewId: executionId,
      prParams,
    });

    if (!contextResult.success) {
      return NextResponse.json(
        { error: 'Failed to collect report context', details: contextResult.error },
        { status: 500 }
      );
    }

    // Generate AI report if score/analysis not provided
    let generatedResult: TestReportResult | null = null;
    if (score === undefined || overallAnalysis === undefined) {
      try {
        const generator = createTestReportGeneratorFromEnv();
        const generateResult = await generator.generate({
          context: contextResult.data,
        });

        if (generateResult.success) {
          generatedResult = generateResult.data;
        } else {
          log.warn('AI report generation failed', { error: generateResult.error });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log.error('AI report generation error:', errorMessage);
      }
    }

    const reportData = {
      title,
      description,
      recommendation,
      recommendationReason: recommendationReason || generatedResult?.recommendationReason,
      summary: summary || generatedResult?.summary,
      overallAnalysis: overallAnalysis || generatedResult?.overallAnalysis,
      score: score ?? generatedResult?.score,
      maxScore: maxScore ?? generatedResult?.maxScore ?? 100,
      acceptanceSuggestion: acceptanceSuggestion || generatedResult?.acceptanceSuggestion,
      keyFindings: generatedResult?.keyFindings,
      concerns: generatedResult?.concerns,
      positives: generatedResult?.positives,
      suggestions: generatedResult?.suggestions,
      testDuration,
      testRunner,
      repositoryName: contextResult.data.plan?.repositoryName,
      repositoryUrl: contextResult.data.plan?.repositoryUrl,
      branchName: contextResult.data.plan?.branchName,
      commitSha: contextResult.data.plan?.commitSha,
      pullRequestId: contextResult.data.plan?.pullRequestId,
      pullRequestUrl: contextResult.data.plan?.pullRequestUrl,
      totalTasks: contextResult.data.tasks.length,
      completedTasks: contextResult.data.tasks.filter((t) => t.status === 'completed').length,
      failedTasks: contextResult.data.tasks.filter((t) => t.status === 'failed').length,
      skippedTasks: contextResult.data.tasks.filter((t) => t.status === 'skipped').length,
      authorId: payload.userId,
      authorName: contextResult.data.execution?.authorName,
      executedAt: contextResult.data.collectedAt,
    };

    let testReport;

    if (existingReport) {
      // Update existing report
      testReport = await prisma.testReport.update({
        where: { id: existingReport.id },
        data: reportData,
      });

      log.info('Test report updated', { reportId: testReport.id, executionId });
    } else {
      // Create new report
      testReport = await prisma.testReport.create({
        data: {
          ...reportData,
          executionId,
        },
      });

      log.info('Test report created', { reportId: testReport.id, executionId });
    }

    return NextResponse.json(testReport, { status: existingReport ? 200 : 201 });
  } catch (error) {
    log.error('Create test report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}