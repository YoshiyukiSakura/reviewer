'use client'

import React, { use, useCallback } from 'react'
import { useTestReport, useTestReportActions } from '@/lib/react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/lib/ui'
import { Button } from '@/lib/ui/button'
import { RecommendationBadge } from '@/lib/ui/recommendation-badge'
import { ScoreGauge } from '@/lib/ui/score-gauge'
import type { TestReport } from '@/types'

/**
 * Format date to readable string
 */
function formatDate(date: Date | string | undefined): string {
  if (!date) return 'N/A'
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Calculate task completion percentage
 */
function calculateCompletionPercentage(report: TestReport): number {
  const { totalTasks, completedTasks = 0 } = report
  if (!totalTasks || totalTasks === 0) return 0
  return Math.round((completedTasks / totalTasks) * 100)
}

/**
 * Calculate success rate (completed + skipped / total)
 */
function calculateSuccessRate(report: TestReport): number {
  const { totalTasks, completedTasks = 0, skippedTasks = 0 } = report
  if (!totalTasks || totalTasks === 0) return 0
  return Math.round(((completedTasks + skippedTasks) / totalTasks) * 100)
}

/**
 * Calculate stability score based on pass/fail ratio
 */
function calculateStabilityScore(report: TestReport): number {
  const { totalTasks, completedTasks = 0, failedTasks = 0, skippedTasks = 0 } = report
  if (!totalTasks || totalTasks === 0) return 100
  // Higher weight on completed, some weight on skipped, penalty for failed
  const score =
    (completedTasks * 1.0 + skippedTasks * 0.5 - failedTasks * 0.5) / totalTasks * 100
  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Loading skeleton for report detail page
 */
function ReportDetailSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="animate-pulse space-y-6">
        {/* Header skeleton */}
        <div className="h-8 w-64 bg-muted rounded mb-2" />
        <div className="h-4 w-48 bg-muted rounded" />

        {/* Info card skeleton */}
        <div className="h-48 bg-muted/50 rounded-lg" />

        {/* Score gauges skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted/50 rounded-lg" />
          ))}
        </div>

        {/* Content cards skeleton */}
        <div className="h-64 bg-muted/50 rounded-lg" />
        <div className="h-48 bg-muted/50 rounded-lg" />
      </div>
    </div>
  )
}

/**
 * Error state component
 */
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="text-destructive text-lg font-medium mb-4">
              {error || 'Failed to load report'}
            </span>
            <Button variant="outline" onClick={onRetry}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Not found state component
 */
function NotFoundState() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="text-4xl mb-4">🔍</span>
            <h2 className="text-xl font-semibold mb-2">Report Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The requested test report could not be found.
            </p>
            <Button variant="outline" onClick={() => (window.location.href = '/reports')}>
              Back to Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Top info card component
 */
function InfoCard({ report }: { report: TestReport }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <CardTitle className="text-xl">{report.title}</CardTitle>
            <CardDescription className="mt-1">{report.description}</CardDescription>
          </div>
          <RecommendationBadge type={report.recommendation} size="lg" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          {/* Repository info */}
          {report.repositoryName && (
            <div className="space-y-1">
              <span className="text-muted-foreground">Repository</span>
              <p className="font-medium">{report.repositoryName}</p>
            </div>
          )}

          {/* Branch info */}
          {report.branchName && (
            <div className="space-y-1">
              <span className="text-muted-foreground">Branch</span>
              <p className="font-medium font-mono text-xs bg-muted px-2 py-1 rounded">
                {report.branchName}
              </p>
            </div>
          )}

          {/* Author info */}
          {report.authorName && (
            <div className="space-y-1">
              <span className="text-muted-foreground">Author</span>
              <p className="font-medium">{report.authorName}</p>
            </div>
          )}

          {/* Commit SHA */}
          {report.commitSha && (
            <div className="space-y-1">
              <span className="text-muted-foreground">Commit</span>
              <p className="font-medium font-mono text-xs bg-muted px-2 py-1 rounded truncate">
                {report.commitSha.substring(0, 7)}
              </p>
            </div>
          )}

          {/* Execution date */}
          {report.executedAt && (
            <div className="space-y-1">
              <span className="text-muted-foreground">Executed</span>
              <p className="font-medium">{formatDate(report.executedAt)}</p>
            </div>
          )}

          {/* Test runner */}
          {report.testRunner && (
            <div className="space-y-1">
              <span className="text-muted-foreground">Test Runner</span>
              <p className="font-medium">{report.testRunner}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Score gauges section component
 */
function ScoreGaugesSection({ report }: { report: TestReport }) {
  const overallScore = report.score ?? 0
  const completionScore = calculateCompletionPercentage(report)
  const successRate = calculateSuccessRate(report)
  const stabilityScore = calculateStabilityScore(report)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="flex flex-col items-center justify-center p-4">
        <ScoreGauge score={overallScore} size="lg" ariaLabel="Overall Score" />
        <p className="text-sm text-muted-foreground mt-2">Overall Score</p>
      </Card>
      <Card className="flex flex-col items-center justify-center p-4">
        <ScoreGauge score={completionScore} size="lg" ariaLabel="Task Completion" />
        <p className="text-sm text-muted-foreground mt-2">Task Completion</p>
      </Card>
      <Card className="flex flex-col items-center justify-center p-4">
        <ScoreGauge score={successRate} size="lg" ariaLabel="Success Rate" />
        <p className="text-sm text-muted-foreground mt-2">Success Rate</p>
      </Card>
      <Card className="flex flex-col items-center justify-center p-4">
        <ScoreGauge score={stabilityScore} size="lg" ariaLabel="Stability Score" />
        <p className="text-sm text-muted-foreground mt-2">Stability Score</p>
      </Card>
    </div>
  )
}

/**
 * Recommendation section component
 */
function RecommendationSection({ report }: { report: TestReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Acceptance Recommendation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recommendation badge and reason */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <RecommendationBadge type={report.recommendation} size="lg" />
          <div className="flex-1">
            <h4 className="text-sm font-medium mb-1">Recommendation Reason</h4>
            <p className="text-sm text-muted-foreground">
              {report.recommendationReason || 'No reason provided'}
            </p>
          </div>
        </div>

        {/* Summary */}
        {report.summary && (
          <div>
            <h4 className="text-sm font-medium mb-1">Summary</h4>
            <p className="text-sm text-muted-foreground">{report.summary}</p>
          </div>
        )}

        {/* Overall Analysis */}
        {report.overallAnalysis && (
          <div>
            <h4 className="text-sm font-medium mb-1">Overall Analysis</h4>
            <p className="text-sm text-muted-foreground">{report.overallAnalysis}</p>
          </div>
        )}

        {/* Acceptance Suggestion */}
        {report.acceptanceSuggestion && (
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2">Acceptance Suggestion</h4>
            <p className="text-sm">{report.acceptanceSuggestion}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Test plan section component
 */
function TestPlanSection({ report }: { report: TestReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Findings */}
        {report.keyFindings && report.keyFindings.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <span className="text-green-500">✓</span> Key Findings
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {report.keyFindings.map((finding, index) => (
                <li key={index}>{finding}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Concerns */}
        {report.concerns && report.concerns.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <span className="text-red-500">⚠</span> Concerns
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {report.concerns.map((concern, index) => (
                <li key={index}>{concern}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Positives */}
        {report.positives && report.positives.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <span className="text-blue-500">+</span> Positives
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {report.positives.map((positive, index) => (
                <li key={index}>{positive}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggestions */}
        {report.suggestions && report.suggestions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <span className="text-purple-500">💡</span> Suggestions
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {report.suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Empty state */}
        {!report.keyFindings?.length &&
          !report.concerns?.length &&
          !report.positives?.length &&
          !report.suggestions?.length && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No test plan details available
            </p>
          )}
      </CardContent>
    </Card>
  )
}

/**
 * Completion analysis section component
 */
function CompletionAnalysisSection({ report }: { report: TestReport }) {
  const { totalTasks, completedTasks, failedTasks, skippedTasks } = report

  return (
    <Card>
      <CardHeader>
        <CardTitle>Completion Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Task statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{totalTasks ?? '-'}</p>
            <p className="text-sm text-muted-foreground">Total Tasks</p>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {completedTasks ?? '-'}
            </p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {failedTasks ?? '-'}
            </p>
            <p className="text-sm text-muted-foreground">Failed</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {skippedTasks ?? '-'}
            </p>
            <p className="text-sm text-muted-foreground">Skipped</p>
          </div>
        </div>

        {/* Completion progress bar */}
        {totalTasks !== undefined && totalTasks > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Completion Progress</span>
              <span className="font-medium">
                {calculateCompletionPercentage(report)}%
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden flex">
              <div
                className="bg-green-500 h-full"
                style={{
                  width: `${((completedTasks ?? 0) / totalTasks) * 100}%`,
                }}
              />
              <div
                className="bg-red-500 h-full"
                style={{
                  width: `${((failedTasks ?? 0) / totalTasks) * 100}%`,
                }}
              />
              <div
                className="bg-yellow-500 h-full"
                style={{
                  width: `${((skippedTasks ?? 0) / totalTasks) * 100}%`,
                }}
              />
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-green-500" /> Completed
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500" /> Failed
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-yellow-500" /> Skipped
              </span>
            </div>
          </div>
        )}

        {/* Test duration */}
        {report.testDuration && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Test Duration:</span>
            <span className="font-medium">
              {report.testDuration < 60
                ? `${report.testDuration}s`
                : `${Math.floor(report.testDuration / 60)}m ${report.testDuration % 60}s`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Action buttons component
 */
function ActionButtons({ report }: { report: TestReport }) {
  const { generateReport, isLoading } = useTestReportActions()

  const handleRegenerate = useCallback(async () => {
    try {
      await generateReport({
        executionId: report.executionId,
        title: report.title,
        description: report.description,
        recommendation: report.recommendation,
      })
      window.location.reload()
    } catch (error) {
      console.error('Failed to regenerate report:', error)
    }
  }, [generateReport, report])

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="outline"
        onClick={handleRegenerate}
        isLoading={isLoading}
        leftIcon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path
              fillRule="evenodd"
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
              clipRule="evenodd"
            />
          </svg>
        }
      >
        Regenerate Report
      </Button>
      {report.pullRequestUrl && (
        <Button
          variant="default"
          onClick={() => window.open(report.pullRequestUrl, '_blank')}
          leftIcon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M4.25 2A2.25 2.25 0 002 4.25v2.5A2.25 2.25 0 004.25 9h2.5A2.25 2.25 0 009 6.75v-2.5A2.25 2.25 0 006.75 2h-2.5zm0 9A2.25 2.25 0 002 13.25v2.5A2.25 2.25 0 004.25 18h2.5A2.25 2.25 0 009 15.75v-2.5A2.25 2.25 0 006.75 13h-2.5zm9-9A2.25 2.25 0 0011 4.25v2.5A2.25 2.25 0 0013.25 9h2.5A2.25 2.25 0 0018 6.75v-2.5A2.25 2.25 0 0015.75 2h-2.5zm0 9A2.25 2.25 0 0011 13.25v2.5A2.25 2.25 0 0013.25 18h2.5A2.25 2.25 0 0018 15.75v-2.5A2.25 2.25 0 0015.75 13h-2.5z"
                clipRule="evenodd"
              />
            </svg>
          }
        >
          View Pull Request
        </Button>
      )}
    </div>
  )
}

/**
 * Report detail page component
 */
export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { testReport, isLoading, error, refetch } = useTestReport(id)

  if (isLoading) {
    return <ReportDetailSkeleton />
  }

  if (error?.status === 404 || !testReport) {
    return <NotFoundState />
  }

  if (error) {
    return <ErrorState error={error.message} onRetry={refetch} />
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Back button and page header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => (window.location.href = '/reports')}
          className="mb-4"
          leftIcon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
                clipRule="evenodd"
              />
            </svg>
          }
        >
          Back to Reports
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Test Report Details</h1>
        <p className="text-muted-foreground mt-1">View detailed analysis and recommendations</p>
      </div>

      {/* Action buttons */}
      <div className="mb-6">
        <ActionButtons report={testReport} />
      </div>

      {/* Main content */}
      <div className="space-y-6">
        {/* Top info card */}
        <InfoCard report={testReport} />

        {/* Score gauges */}
        <ScoreGaugesSection report={testReport} />

        {/* Two column layout for recommendation and test plan */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecommendationSection report={testReport} />
          <TestPlanSection report={testReport} />
        </div>

        {/* Completion analysis (full width) */}
        <CompletionAnalysisSection report={testReport} />
      </div>
    </div>
  )
}