/**
 * AI Review Prompt Templates
 *
 * This module provides prompt templates for AI-powered code review functionality.
 * Templates are designed for different review scenarios and can be customized
 * with context-specific parameters.
 */

// ========== Types ==========

/**
 * Severity level for review comments
 */
export type CommentSeverity = 'critical' | 'warning' | 'suggestion' | 'info';

/**
 * Review context containing information about the code being reviewed
 */
export interface ReviewContext {
  /** The diff content to review */
  diff: string;
  /** File path being reviewed */
  filePath?: string;
  /** Programming language of the file */
  language?: string;
  /** Pull request title */
  prTitle?: string;
  /** Pull request description */
  prDescription?: string;
  /** Additional context or instructions */
  additionalContext?: string;
}

/**
 * Parameters for generating a focused review prompt
 */
export interface FocusedReviewParams {
  /** The diff content to review */
  diff: string;
  /** Specific areas to focus on */
  focusAreas: string[];
  /** File path being reviewed */
  filePath?: string;
}

/**
 * Parameters for generating a security review prompt
 */
export interface SecurityReviewParams {
  /** The diff content to review */
  diff: string;
  /** File path being reviewed */
  filePath?: string;
  /** Programming language of the file */
  language?: string;
}

/**
 * Structure of an expected review comment from AI
 */
export interface ReviewCommentStructure {
  /** Line number in the diff where the comment applies */
  line: number;
  /** Severity of the issue */
  severity: CommentSeverity;
  /** Category of the comment */
  category: string;
  /** The review comment content */
  comment: string;
  /** Suggested fix if applicable */
  suggestion?: string;
}

// ========== System Prompts ==========

/**
 * Base system prompt that establishes the AI's role as a code reviewer
 */
export const SYSTEM_PROMPT_BASE = `You are an expert code reviewer with deep knowledge of software engineering best practices, security, and code quality. Your role is to provide constructive, actionable feedback on code changes.

Guidelines for your reviews:
- Be specific and reference exact line numbers when possible
- Prioritize issues by severity (critical > warning > suggestion > info)
- Explain WHY something is an issue, not just WHAT the issue is
- Provide concrete suggestions for improvement when possible
- Be respectful and constructive in your feedback
- Focus on significant issues rather than nitpicking style preferences
- Consider the context and intent of the changes`;

/**
 * System prompt for security-focused reviews
 */
export const SYSTEM_PROMPT_SECURITY = `You are a security-focused code reviewer specializing in identifying vulnerabilities and security issues. Your expertise includes:

- OWASP Top 10 vulnerabilities
- Injection attacks (SQL, Command, XSS, etc.)
- Authentication and authorization flaws
- Sensitive data exposure
- Security misconfigurations
- Cryptographic weaknesses
- Input validation issues

Guidelines:
- Identify potential security vulnerabilities with specific CVE references when applicable
- Assess the severity and potential impact of each issue
- Provide remediation steps for identified vulnerabilities
- Consider the attack surface and threat model
- Flag any hardcoded secrets or credentials`;

/**
 * System prompt for performance-focused reviews
 */
export const SYSTEM_PROMPT_PERFORMANCE = `You are a performance-focused code reviewer specializing in identifying performance issues and optimization opportunities. Your expertise includes:

- Algorithm complexity analysis (time and space)
- Memory management and leak prevention
- Database query optimization
- Caching strategies
- Asynchronous programming patterns
- Resource utilization

Guidelines:
- Identify performance bottlenecks and their impact
- Suggest concrete optimizations with expected improvements
- Consider trade-offs between readability and performance
- Flag N+1 queries, unnecessary iterations, and memory issues
- Recommend appropriate data structures and algorithms`;

// ========== User Prompt Templates ==========

/**
 * Generates a comprehensive code review prompt
 *
 * @param context - The review context containing diff and metadata
 * @returns Formatted prompt string for comprehensive review
 *
 * @example
 * ```typescript
 * const prompt = generateReviewPrompt({
 *   diff: '+ const x = 1;',
 *   filePath: 'src/utils.ts',
 *   language: 'typescript',
 *   prTitle: 'Add utility function'
 * });
 * ```
 */
export function generateReviewPrompt(context: ReviewContext): string {
  const { diff, filePath, language, prTitle, prDescription, additionalContext } = context;

  let prompt = `Please review the following code changes and provide detailed feedback.\n\n`;

  if (prTitle) {
    prompt += `## Pull Request: ${prTitle}\n\n`;
  }

  if (prDescription) {
    prompt += `## Description:\n${prDescription}\n\n`;
  }

  if (filePath) {
    prompt += `## File: ${filePath}\n`;
  }

  if (language) {
    prompt += `## Language: ${language}\n`;
  }

  prompt += `\n## Changes:\n\`\`\`diff\n${diff}\n\`\`\`\n\n`;

  if (additionalContext) {
    prompt += `## Additional Context:\n${additionalContext}\n\n`;
  }

  prompt += `## Review Instructions:
Please analyze the code changes and provide feedback in the following JSON format:

\`\`\`json
{
  "summary": "Brief summary of the changes and overall assessment",
  "comments": [
    {
      "line": <line_number>,
      "severity": "critical|warning|suggestion|info",
      "category": "security|performance|maintainability|correctness|style",
      "comment": "Description of the issue or suggestion",
      "suggestion": "Optional: Suggested fix or improvement"
    }
  ],
  "approval": "approve|request_changes|comment",
  "overallScore": <1-10>
}
\`\`\`

Focus on:
1. Correctness and potential bugs
2. Security vulnerabilities
3. Performance issues
4. Code maintainability and readability
5. Best practices and patterns`;

  return prompt;
}

/**
 * Generates a focused review prompt targeting specific areas
 *
 * @param params - Parameters including diff and focus areas
 * @returns Formatted prompt string for focused review
 *
 * @example
 * ```typescript
 * const prompt = generateFocusedReviewPrompt({
 *   diff: '+ const password = "secret";',
 *   focusAreas: ['security', 'best-practices'],
 *   filePath: 'src/auth.ts'
 * });
 * ```
 */
export function generateFocusedReviewPrompt(params: FocusedReviewParams): string {
  const { diff, focusAreas, filePath } = params;

  let prompt = `Please review the following code changes with a specific focus on: ${focusAreas.join(', ')}.\n\n`;

  if (filePath) {
    prompt += `## File: ${filePath}\n\n`;
  }

  prompt += `## Changes:\n\`\`\`diff\n${diff}\n\`\`\`\n\n`;

  prompt += `## Focus Areas:\n`;
  focusAreas.forEach((area, index) => {
    prompt += `${index + 1}. ${area}\n`;
  });

  prompt += `\nProvide your feedback in the following JSON format:

\`\`\`json
{
  "focusAreaFindings": {
    "<focus_area>": [
      {
        "line": <line_number>,
        "severity": "critical|warning|suggestion|info",
        "finding": "Description of the finding",
        "recommendation": "Suggested improvement"
      }
    ]
  },
  "summary": "Overall assessment related to the focus areas"
}
\`\`\``;

  return prompt;
}

/**
 * Generates a security-focused review prompt
 *
 * @param params - Parameters for security review
 * @returns Formatted prompt string for security review
 *
 * @example
 * ```typescript
 * const prompt = generateSecurityReviewPrompt({
 *   diff: '+ exec(userInput);',
 *   filePath: 'src/utils.ts',
 *   language: 'javascript'
 * });
 * ```
 */
export function generateSecurityReviewPrompt(params: SecurityReviewParams): string {
  const { diff, filePath, language } = params;

  let prompt = `Perform a security-focused review of the following code changes.\n\n`;

  if (filePath) {
    prompt += `## File: ${filePath}\n`;
  }

  if (language) {
    prompt += `## Language: ${language}\n`;
  }

  prompt += `\n## Changes:\n\`\`\`diff\n${diff}\n\`\`\`\n\n`;

  prompt += `## Security Review Checklist:
- [ ] Input validation and sanitization
- [ ] Authentication and authorization
- [ ] SQL/NoSQL injection vulnerabilities
- [ ] Cross-site scripting (XSS)
- [ ] Command injection
- [ ] Path traversal
- [ ] Sensitive data exposure
- [ ] Insecure cryptography
- [ ] Hardcoded secrets or credentials
- [ ] Insecure dependencies

Provide your security assessment in the following JSON format:

\`\`\`json
{
  "vulnerabilities": [
    {
      "line": <line_number>,
      "severity": "critical|high|medium|low",
      "type": "OWASP category or vulnerability type",
      "description": "Detailed description of the vulnerability",
      "impact": "Potential impact if exploited",
      "remediation": "Steps to fix the vulnerability",
      "references": ["Optional: CVE or reference links"]
    }
  ],
  "securityScore": <1-10>,
  "summary": "Overall security assessment"
}
\`\`\``;

  return prompt;
}

/**
 * Generates a prompt for reviewing code style and conventions
 *
 * @param diff - The diff content to review
 * @param styleguide - Optional style guide or conventions to follow
 * @returns Formatted prompt string for style review
 */
export function generateStyleReviewPrompt(diff: string, styleguide?: string): string {
  let prompt = `Review the following code changes for style and convention compliance.\n\n`;

  prompt += `## Changes:\n\`\`\`diff\n${diff}\n\`\`\`\n\n`;

  if (styleguide) {
    prompt += `## Style Guide:\n${styleguide}\n\n`;
  }

  prompt += `Check for:
- Naming conventions (variables, functions, classes)
- Code formatting and indentation
- Comment quality and documentation
- Import organization
- File structure and organization
- Consistent patterns

Provide feedback in JSON format:

\`\`\`json
{
  "styleIssues": [
    {
      "line": <line_number>,
      "issue": "Description of the style issue",
      "suggestion": "How to fix it"
    }
  ],
  "overallCompliance": "good|acceptable|needs_improvement",
  "summary": "Brief assessment of code style"
}
\`\`\``;

  return prompt;
}

/**
 * Generates a prompt for inline comment suggestions
 *
 * @param diff - The diff content
 * @param lineNumber - Specific line to comment on
 * @param existingCode - The existing code at that line
 * @returns Formatted prompt for generating an inline comment
 */
export function generateInlineCommentPrompt(
  diff: string,
  lineNumber: number,
  existingCode: string
): string {
  return `Given the following diff, suggest an appropriate review comment for line ${lineNumber}.

## Full Diff Context:
\`\`\`diff
${diff}
\`\`\`

## Specific Line (${lineNumber}):
\`\`\`
${existingCode}
\`\`\`

Provide a concise, actionable review comment for this line. Include:
1. What the issue or suggestion is
2. Why it matters
3. How to improve it (if applicable)

Format your response as JSON:
\`\`\`json
{
  "comment": "Your review comment",
  "severity": "critical|warning|suggestion|info",
  "category": "security|performance|maintainability|correctness|style"
}
\`\`\``;
}

/**
 * Generates a prompt for summarizing multiple file changes
 *
 * @param files - Array of file paths and their diffs
 * @param prTitle - Pull request title
 * @param prDescription - Pull request description
 * @returns Formatted prompt for PR summary review
 */
export function generatePRSummaryPrompt(
  files: Array<{ path: string; diff: string }>,
  prTitle: string,
  prDescription?: string
): string {
  let prompt = `Review the following pull request and provide an overall assessment.\n\n`;

  prompt += `## Pull Request: ${prTitle}\n\n`;

  if (prDescription) {
    prompt += `## Description:\n${prDescription}\n\n`;
  }

  prompt += `## Changed Files (${files.length}):\n\n`;

  files.forEach(({ path, diff }) => {
    prompt += `### ${path}\n\`\`\`diff\n${diff}\n\`\`\`\n\n`;
  });

  prompt += `Provide an overall PR review in JSON format:

\`\`\`json
{
  "summary": "High-level summary of what this PR does",
  "keyChanges": ["List of key changes"],
  "concerns": ["List of concerns or issues"],
  "suggestions": ["List of improvement suggestions"],
  "testingRecommendations": ["What should be tested"],
  "approval": "approve|request_changes|comment",
  "overallScore": <1-10>
}
\`\`\``;

  return prompt;
}

// ========== Prompt Utilities ==========

/**
 * Truncates diff content if it exceeds the maximum length
 *
 * @param diff - The diff content to truncate
 * @param maxLength - Maximum allowed length (default: 10000)
 * @returns Truncated diff with indicator if truncated
 */
export function truncateDiff(diff: string, maxLength: number = 10000): string {
  if (diff.length <= maxLength) {
    return diff;
  }

  const truncated = diff.slice(0, maxLength);
  const lastNewline = truncated.lastIndexOf('\n');

  return `${truncated.slice(0, lastNewline)}\n\n... [truncated - ${diff.length - lastNewline} characters omitted]`;
}

/**
 * Extracts the programming language from a file path
 *
 * @param filePath - The file path to analyze
 * @returns The detected programming language or undefined
 */
export function detectLanguage(filePath: string): string | undefined {
  const extensionMap: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.py': 'python',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.java': 'java',
    '.kt': 'kotlin',
    '.swift': 'swift',
    '.cs': 'csharp',
    '.cpp': 'cpp',
    '.c': 'c',
    '.php': 'php',
    '.vue': 'vue',
    '.svelte': 'svelte',
    '.sql': 'sql',
    '.sh': 'bash',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.json': 'json',
    '.md': 'markdown',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
  };

  const extension = filePath.slice(filePath.lastIndexOf('.'));
  return extensionMap[extension];
}

// ========== Export Convenience Object ==========

/**
 * Prompts object providing convenient access to all prompt generation functions
 */
export const prompts = {
  /** System prompts for different review contexts */
  system: {
    base: SYSTEM_PROMPT_BASE,
    security: SYSTEM_PROMPT_SECURITY,
    performance: SYSTEM_PROMPT_PERFORMANCE,
  },

  /** Generate comprehensive code review prompt */
  review: generateReviewPrompt,

  /** Generate focused review prompt */
  focused: generateFocusedReviewPrompt,

  /** Generate security review prompt */
  security: generateSecurityReviewPrompt,

  /** Generate style review prompt */
  style: generateStyleReviewPrompt,

  /** Generate inline comment prompt */
  inline: generateInlineCommentPrompt,

  /** Generate PR summary prompt */
  prSummary: generatePRSummaryPrompt,

  /** Utility functions */
  utils: {
    truncateDiff,
    detectLanguage,
  },
};

export default prompts;
