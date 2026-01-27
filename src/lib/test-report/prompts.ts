/**
 * Test Report Prompt Templates
 *
 * This module provides prompt templates for AI-powered test report generation.
 * Templates are designed to analyze review data and generate comprehensive test reports
 * with scoring, analysis, and acceptance suggestions.
 */

import type { TestReportContext } from './collector';

// ========== Types ==========

/**
 * Recommendation type for test report
 */
export type TestReportRecommendation = 'MERGE' | 'NEEDS_CHANGES' | 'REJECT';

/**
 * Structure of an expected test report result from AI
 */
export interface TestReportResult {
  /** Overall summary of the test report */
  summary: string;
  /** Detailed analysis of the review */
  overallAnalysis: string;
  /** Overall score (0-100) */
  score: number;
  /** Maximum possible score */
  maxScore: number;
  /** Recommendation for the PR */
  recommendation: TestReportRecommendation;
  /** Reason for the recommendation */
  recommendationReason: string;
  /** Suggestion for acceptance */
  acceptanceSuggestion: string;
  /** Key findings from the review */
  keyFindings: string[];
  /** Areas that need attention */
  concerns: string[];
  /** Positive aspects noted */
  positives: string[];
  /** Suggestions for improvement */
  suggestions: string[];
}

/**
 * Parameters for generating a test report prompt
 */
export interface GenerateTestReportPromptParams {
  /** The collected test report context */
  context: TestReportContext;
  /** Optional additional instructions */
  additionalContext?: string;
}

// ========== System Prompts ==========

/**
 * System prompt that establishes the AI's role as a test report generator
 * with scoring criteria and acceptance suggestions
 */
export const SYSTEM_PROMPT_TEST_REPORT = `You are an expert software quality analyst specializing in code review assessment and test report generation. Your role is to analyze review data, code changes, and conversation history to generate comprehensive test reports with objective scoring and actionable recommendations.

## Scoring Criteria (0-100 points)

### Code Quality (0-30 points)
- **Correctness** (0-10): Does the code work as intended? Are there logical errors or bugs?
- **Completeness** (0-10): Does the implementation cover all requirements? Are edge cases handled?
- **Code Style** (0-5): Is the code readable and well-formatted? Follows project conventions?
- **Complexity** (0-5): Is the solution appropriately complex? Are there unnecessary complexities?

### Review Quality (0-25 points)
- **Comment Thoroughness** (0-10): Are reviews detailed and actionable? Do they provide good explanations?
- **Issue Identification** (0-10): Are issues correctly identified with proper severity levels?
- **Resolution Rate** (0-5): What percentage of identified issues are resolved?

### Process Quality (0-25 points)
- **Communication** (0-10): Is the review process well-documented and communicative?
- **Collaboration** (0-10): Are reviewers and authors working effectively together?
- **Timeliness** (0-5): Is the review process completed in a reasonable time?

### Security & Risk (0-20 points)
- **Security Concerns** (0-10): Are security vulnerabilities identified and addressed?
- **Technical Debt** (0-5): Does the change introduce unnecessary technical debt?
- **Risk Assessment** (0-5): What is the overall risk level of the changes?

## Acceptance Suggestion Standards

### MERGE (Recommended when):
- Score >= 70 points
- All critical and security issues are resolved
- Code quality meets project standards
- Review comments are addressed or acknowledged

### NEEDS_CHANGES (Recommended when):
- Score between 40-69 points
- Non-critical issues remain unaddressed
- Code quality needs improvement
- Missing tests or documentation

### REJECT (Recommended when):
- Score < 40 points
- Critical bugs or security vulnerabilities present
- Code does not meet quality standards
- Fundamental design flaws identified

## Output Format

You must provide your analysis in the following JSON format:

\`\`\`json
{
  "summary": "Brief overview of the test report",
  "overallAnalysis": "Comprehensive analysis of the review process and code changes",
  "score": <number 0-100>,
  "maxScore": 100,
  "recommendation": "MERGE|NEEDS_CHANGES|REJECT",
  "recommendationReason": "Detailed explanation for the recommendation",
  "acceptanceSuggestion": "Specific actionable suggestion for the reviewer",
  "keyFindings": ["List of key findings from the review"],
  "concerns": ["List of concerns or issues found"],
  "positives": ["List of positive aspects observed"],
  "suggestions": ["List of improvement suggestions"]
}
\`\`\`

Guidelines:
- Be objective and evidence-based in your assessment
- Reference specific data points (comment counts, issue types, etc.)
- Provide actionable recommendations
- Balance positive reinforcement with constructive criticism
- Consider the context and intent of the changes`;

// ========== Prompt Generation Functions ==========

/**
 * Generates a comprehensive test report prompt
 *
 * @param params - Parameters including context and optional additional instructions
 * @returns Formatted prompt string for generating a test report
 *
 * @example
 * ```typescript
 * const context = await collectTestReportContext({ reviewId: 'abc123' });
 * const prompt = generateTestReportPrompt({ context });
 * ```
 */
export function generateTestReportPrompt(params: GenerateTestReportPromptParams): string {
  const { context, additionalContext } = params;
  const { execution, plan, tasks, conversation, prDiff, collectedAt } = context;

  let prompt = `# AI Test Report Generation Request

Please analyze the following review data and generate a comprehensive test report with scoring and recommendations.

## Analysis Date
${collectedAt.toISOString()}

`;

  // Execution Information
  if (execution) {
    prompt += `## Execution Information
- **ID**: ${execution.id}
- **Title**: ${execution.title}
- **Description**: ${execution.description || 'N/A'}
- **Status**: ${execution.status}
- **Source Type**: ${execution.sourceType || 'N/A'}
- **Author**: ${execution.authorName || 'Unknown'}
- **Created At**: ${execution.createdAt.toISOString()}
- **Updated At**: ${execution.updatedAt.toISOString()}

`;
  }

  // Plan Information
  if (plan) {
    prompt += `## Plan Information
- **Name**: ${plan.name}
- **Description**: ${plan.description || 'N/A'}
- **Status**: ${plan.status}
- **Repository**: ${plan.repositoryName || 'N/A'}
- **Repository URL**: ${plan.repositoryUrl || 'N/A'}
- **Branch**: ${plan.branchName || 'N/A'}
- **Commit**: ${plan.commitSha ? plan.commitSha.substring(0, 7) : 'N/A'}
- **Pull Request**: ${plan.pullRequestId || 'N/A'}
- **PR URL**: ${plan.pullRequestUrl || 'N/A'}

`;
  }

  // Task Statistics
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  const failedTasks = tasks.filter((t) => t.status === 'failed').length;
  const skippedTasks = tasks.filter((t) => t.status === 'skipped').length;

  prompt += `## Task Statistics
- **Total Tasks**: ${tasks.length}
- **Completed**: ${completedTasks}
- **In Progress**: ${inProgressTasks}
- **Pending**: ${pendingTasks}
- **Failed**: ${failedTasks}
- **Skipped**: ${skippedTasks}

`;

  // Task Details (if any)
  if (tasks.length > 0) {
    prompt += `### Task Details\n`;
    tasks.forEach((task, index) => {
      prompt += `${index + 1}. **${task.title}**
   - ID: ${task.taskId}
   - Status: ${task.status}
   - Assignee: ${task.assigneeName || 'Unassigned'}

`;
    });
  }

  // Conversation Summary
  prompt += `## Conversation Summary
- **Total Comments**: ${conversation.totalComments}
- **Resolved Comments**: ${conversation.resolvedComments}
- **Unresolved Comments**: ${conversation.unresolvedComments}

`;

  // Comment Details (if any)
  if (conversation.comments.length > 0) {
    prompt += `### Comments\n`;
    conversation.comments.forEach((comment, index) => {
      prompt += `${index + 1}. **${comment.authorName || 'Anonymous'}** at ${comment.createdAt.toISOString()}
   - File: ${comment.filePath || 'N/A'}
   - Line: ${comment.lineStart || 'N/A'}
   - Severity: ${comment.severity || 'N/A'}
   - Resolved: ${comment.isResolved ? 'Yes' : 'No'}
   - Content: ${comment.content.substring(0, 200)}${comment.content.length > 200 ? '...' : ''}

`;
    });
  }

  // PR Diff Information
  if (prDiff) {
    prompt += `## Pull Request Information
- **Owner**: ${prDiff.owner}
- **Repository**: ${prDiff.repo}
- **Pull Request #**: ${prDiff.pullNumber}
- **Total Additions**: +${prDiff.totalAdditions}
- **Total Deletions**: -${prDiff.totalDeletions}
- **Total Changes**: ${prDiff.totalChanges}
- **Files Changed**: ${prDiff.files.length}

`;

    // File Changes Summary
    prompt += `### Files Changed\n`;
    prDiff.files.forEach((file, index) => {
      prompt += `${index + 1}. **${file.filename}**
   - Status: ${file.status}
   - Additions: +${file.additions}
   - Deletions: -${file.deletions}

`;
    });
  }

  // Additional Context
  if (additionalContext) {
    prompt += `## Additional Context
${additionalContext}

`;
  }

  // Instructions
  prompt += `## Analysis Instructions

Based on the data provided above, please generate a comprehensive test report with:

1. An overall score (0-100) based on the criteria in your system prompt
2. A clear recommendation (MERGE, NEEDS_CHANGES, or REJECT)
3. Detailed analysis of the review process
4. Key findings, concerns, and positives
5. Actionable suggestions for improvement

Please ensure your JSON response is valid and complete.`;

  return prompt;
}

// ========== Export Convenience Object ==========

/**
 * Prompts object providing convenient access to all prompt generation functions
 */
export const testReportPrompts = {
  /** System prompt for test report generation */
  system: SYSTEM_PROMPT_TEST_REPORT,

  /** Generate comprehensive test report prompt */
  generate: generateTestReportPrompt,
};

export default testReportPrompts;